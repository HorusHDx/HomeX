"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrapedServer } from "@/lib/unlimplay";
import { markWatched } from "@/lib/continue";
import { getDetailClient, getSeasonClient } from "@/lib/tmdb-client";
import type { TMDBEpisode } from "@/lib/tmdb";
import HlsPlayer from "@/components/HlsPlayer";
import type { NsrServer } from "@/lib/nsr";

interface Props {
  params: { type: "movie" | "tv"; id: string };
}

const LANG_ORDER = ["latino", "castellano", "subtitulado", "original"];

function normalizeLang(lang: string): string {
  const l = lang.toLowerCase().trim();
  if (l.includes("latino") || l.includes("mexico") || l.includes("mx")) return "latino";
  if (l.includes("castellano") || l.includes("español") || l.includes("espanol")) return "castellano";
  if (l.includes("sub")) return "subtitulado";
  if (l.includes("original")) return "original";
  return l;
}

const LANG_LABELS: Record<string, string> = {
  latino: "Audio Latino Mx",
  castellano: "Audio Castellano Esp",
  subtitulado: "Audio Original Subtitulado",
  original: "Audio Original",
};

function WatchInner({ params }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const season = Math.max(1, parseInt(searchParams.get("season") || "1", 10) || 1);
  const episode = Math.max(1, parseInt(searchParams.get("episode") || "1", 10) || 1);

  // "server1" = Unlimplay (embeds), "server2" = NSR Play (streams directos).
  const [source, setSource] = useState<"server1" | "server2">("server1");

  const [servers, setServers] = useState<ScrapedServer[]>([]);
  const [activeServer, setActiveServer] = useState<ScrapedServer | null>(null);
  const [loading, setLoading] = useState(true);
  // Server1 no logró extraer ninguna fuente: saltamos solos a Server2.
  const [oneEmpty, setOneEmpty] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [detailData, setDetailData] = useState<{ title: string; poster: string | null } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Estado de Server2: se carga solo al pulsarlo (ahorra cuota de la API).
  const [nsrServers, setNsrServers] = useState<NsrServer[]>([]);
  const [nsrLoaded, setNsrLoaded] = useState(false);
  const [nsrLoading, setNsrLoading] = useState(false);
  const [nsrActive, setNsrActive] = useState<number | null>(null);
  const [stream, setStream] = useState<{ url: string; format: "hls" | "mp4" } | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  // Servidores de Server2 que ya fallaron: se marcan en la lista y se evitan.
  const [badServers, setBadServers] = useState<number[]>([]);
  // Espejos en ref: onStreamFailed se dispara desde hls.js y necesita leer
  // el estado más reciente sin depender de closures.
  const nsrServersRef = useRef<NsrServer[]>([]);
  const nsrActiveRef = useRef<number | null>(null);
  const badRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveServer(null);
    setOneEmpty(false);
    fetch(`/api/servers?type=${params.type}&id=${encodeURIComponent(params.id)}&season=${season}&episode=${episode}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const srv = data.servers || [];
        setServers(srv);
        setActiveServer(srv[0] || null);
        setOneEmpty(data.noSources === true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setOneEmpty(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.type, params.id, season, episode]);

  // Cada cambio de episodio/título reinicia Server2: no arrastra servidores
  // ni streams de un capítulo anterior.
  useEffect(() => {
    setNsrServers([]);
    setNsrLoaded(false);
    setNsrLoading(false);
    setNsrActive(null);
    setStream(null);
    setStreamError(false);
    setStreamLoading(false);
    setBadServers([]);
    nsrServersRef.current = [];
    nsrActiveRef.current = null;
    badRef.current = [];
  }, [params.type, params.id, season, episode]);

  const playNsrServer = async (index: number) => {
    nsrActiveRef.current = index;
    setNsrActive(index);
    setStreamLoading(true);
    setStreamError(false);
    setStream(null);
    const markBad = () => {
      if (badRef.current.includes(index)) return;
      badRef.current = [...badRef.current, index];
      setBadServers(badRef.current);
    };
    try {
      const qs = new URLSearchParams({
        type: params.type,
        id: params.id,
        season: String(season),
        episode: String(episode),
        index: String(index),
      });
      const res = await fetch(`/api/nsr/stream?${qs}`);
      const data = await res.json();
      if (!res.ok || !data?.url) {
        markBad();
        return;
      }
      setStream({ url: data.url, format: data.format === "mp4" ? "mp4" : "hls" });
    } catch {
      markBad();
    } finally {
      setStreamLoading(false);
    }
  };

  // Un servidor muerto no debe dejar al usuario sin nada: saltamos al
  // siguiente disponible (máx. 3 intentos para no entrar en bucle).
  const onStreamFailed = useCallback(() => {
    const current = nsrActiveRef.current;
    if (current !== null && !badRef.current.includes(current)) {
      badRef.current = [...badRef.current, current];
      setBadServers(badRef.current);
    }
    const next = nsrServersRef.current.find(
      (s) => s.index !== current && !badRef.current.includes(s.index)
    );
    if (!next || badRef.current.length >= 3) {
      setStreamError(true);
      return;
    }
    window.setTimeout(() => void playNsrServer(next.index), 400);
    // playNsrServer solo depende de params/season/episode (props estables).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.type, params.id, season, episode]);

  const loadNsr = async () => {
    setNsrLoading(true);
    try {
      const qs = new URLSearchParams({
        type: params.type,
        id: params.id,
        season: String(season),
        episode: String(episode),
      });
      const res = await fetch(`/api/nsr/servers?${qs}`);
      const data = await res.json();
      const list: NsrServer[] = Array.isArray(data?.servers) ? data.servers : [];
      nsrServersRef.current = list;
      setNsrServers(list);
      setNsrLoaded(true);
      if (list.length > 0) void playNsrServer(list[0].index);
    } catch {
      setNsrServers([]);
      setNsrLoaded(true);
    } finally {
      setNsrLoading(false);
    }
  };

  const switchSource = (next: "server1" | "server2") => {
    setSource(next);
    if (next === "server2" && !nsrLoaded && !nsrLoading) void loadNsr();
  };

  // Server1 sin fuentes: pasamos solos a Server2 tras un instante, para que el
  // letrero "Sin servidores para este título" se vea antes de cambiar.
  // El usuario siempre puede volver a Server1 con el botón.
  useEffect(() => {
    if (loading || !oneEmpty) return;
    const t = window.setTimeout(() => switchSource("server2"), 900);
    return () => window.clearTimeout(t);
    // switchSource se recrea en cada render: solo interesa disparar una vez
    // cuando Server1 termina de cargar vacío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, oneEmpty]);

  useEffect(() => {
    let cancelled = false;
    // Vía proxy /api/tmdb para no exponer la key
    getDetailClient(params.type, params.id)
      .then((data) => {
        if (!cancelled) setDetailData({ title: data.name || data.title || "", poster: data.poster_path || null });
      })
      .catch(() => {});
    if (params.type === "tv") {
      getSeasonClient(params.id, season)
        .then((data) => {
          if (!cancelled) setEpisodes(data.episodes || []);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [params.type, params.id, season]);

  useEffect(() => {
    if (detailData?.title) {
      markWatched(
        { id: Number(params.id), media: params.type, title: detailData.title, poster: detailData.poster },
        season,
        episode
      );
    }
  }, [params.type, params.id, season, episode, detailData]);

  const toggleFull = async () => {
    const el = frameRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        setIsFull((v) => !v);
      }
    } catch {
      setIsFull((v) => !v);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const groups = LANG_ORDER.map((lang) => ({
    lang,
    items: servers.filter((s) => normalizeLang(s.lang) === lang),
  })).filter((g) => g.items.length > 0);

  const ungrouped = servers.filter(
    (s) => !LANG_ORDER.includes(normalizeLang(s.lang))
  );

  const currentIndex = episodes.findIndex((e) => e.episode_number === episode);
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;

  const goToEpisode = (epNum: number) => {
    router.push(`/watch/tv/${params.id}?season=${season}&episode=${epNum}`);
  };

  const backHref = params.type === "tv"
    ? `/detail/tv/${params.id}`
    : `/detail/movie/${params.id}`;

  return (
    <div className={`watch${isFull ? " css-full" : ""}`}>
      <div className="watch-top">
        <Link href={backHref} className="watch-back">
          ← Volver
        </Link>
        <div className="watch-title">
          <h1>
            {params.type === "movie"
              ? detailData?.title || "Película"
              : `${detailData?.title || ""} · T${season} E${episode}`}
          </h1>
        </div>
        <div className="watch-src" role="tablist" aria-label="Servidor">
          <button
            role="tab"
            aria-selected={source === "server1"}
            className={`watch-srcbtn${source === "server1" ? " on" : ""}`}
            onClick={() => switchSource("server1")}
          >
            Server1
          </button>
          <button
            role="tab"
            aria-selected={source === "server2"}
            className={`watch-srcbtn${source === "server2" ? " on" : ""}`}
            onClick={() => switchSource("server2")}
          >
            Server2
          </button>
        </div>
        <button className="watch-fullbtn" onClick={toggleFull}>
          {isFull ? "Salir" : "Pantalla completa"}
        </button>
      </div>

      <div className="watch-frame" ref={frameRef}>
        {source === "server1" ? (
          <>
            {loading && (
              <div className="watch-loading">
                <div className="skeleton" style={{ width: "60%", height: 28 }} />
                <div className="skeleton" style={{ width: "40%", height: 16 }} />
              </div>
            )}

            {!loading && oneEmpty && (
              <div className="state">
                <h3>Sin servidores para este título</h3>
                <p>Server1 no tiene ninguna fuente. Buscando en Server2…</p>
                <button onClick={() => switchSource("server2")}>Ver Server2</button>
              </div>
            )}

            {/* Con oneEmpty no montamos el iframe del embed: Unlimplay no
                encontró nada y solo se vería su pantalla de error. El botón
                "Servidor Principal" de la lista sigue disponible por si el
                usuario quiere probarlo a mano. */}
            {activeServer && !oneEmpty && (
              <iframe
                key={activeServer.url}
                src={activeServer.url}
                title="Video"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            )}
          </>
        ) : (
          <>
            {nsrLoading && (
              <div className="watch-loading">
                <div className="skeleton" style={{ width: "60%", height: 28 }} />
                <div className="skeleton" style={{ width: "40%", height: 16 }} />
              </div>
            )}

            {!nsrLoading && nsrLoaded && nsrServers.length === 0 && (
              <div className="state">
                <h3>Sin servidores para este título</h3>
                <p>Server2 tampoco tiene fuentes disponibles ahora mismo.</p>
                <button onClick={() => switchSource("server1")}>Volver a Server1</button>
              </div>
            )}

            {stream && (
              <HlsPlayer
                key={stream.url}
                src={stream.url}
                format={stream.format}
                title={detailData?.title || "Video"}
                onEnded={nextEp ? () => goToEpisode(nextEp.episode_number) : undefined}
                onError={onStreamFailed}
              />
            )}

            {streamLoading && (
              <div className="watch-loading">
                <div className="skeleton" style={{ width: "60%", height: 28 }} />
                <div className="skeleton" style={{ width: "40%", height: 16 }} />
              </div>
            )}

            {!stream && !streamLoading && streamError && (
              <div className="state">
                <h3>No se pudo reproducir</h3>
                <p>Elige otro servidor de la lista de abajo.</p>
                <button onClick={() => window.location.reload()}>Reintentar</button>
              </div>
            )}
          </>
        )}
      </div>

      {params.type === "tv" && episodes.length > 0 && (
        <div className="watch-nav">
          <button
            className="watch-navbtn"
            disabled={!prevEp}
            onClick={() => prevEp && goToEpisode(prevEp.episode_number)}
          >
            ← Anterior
          </button>
          <span className="watch-nav-pos">
            Episodio {episode} de {episodes.length}
          </span>
          <button
            className="watch-navbtn"
            disabled={!nextEp}
            onClick={() => nextEp && goToEpisode(nextEp.episode_number)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {source === "server1" && (
        <>
          {groups.map((group) => (
            <div className="watch-audio" key={group.lang}>
              <h2 className="watch-audio-title">{LANG_LABELS[group.lang] || group.lang}</h2>
              <div className="watch-audio-list">
                {group.items.map((s, i) => (
                  <button
                    key={`${s.url}-${i}`}
                    className={`watch-server${activeServer?.url === s.url ? " on" : ""}`}
                    onClick={() => setActiveServer(s)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="watch-audio">
              <h2 className="watch-audio-title">Otros</h2>
              <div className="watch-audio-list">
                {ungrouped.map((s, i) => (
                  <button
                    key={`${s.url}-${i}`}
                    className={`watch-server${activeServer?.url === s.url ? " on" : ""}`}
                    onClick={() => setActiveServer(s)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {source === "server2" && nsrServers.length > 0 && (
        <>
          {LANG_ORDER.map((lang) => {
            const items = nsrServers.filter((s) => s.lang === lang);
            if (items.length === 0) return null;
            return (
              <div className="watch-audio" key={lang}>
                <h2 className="watch-audio-title">{LANG_LABELS[lang] || lang}</h2>
                <div className="watch-audio-list">
                  {items.map((s) => (
                    <button
                      key={s.index}
                      className={`watch-server${nsrActive === s.index ? " on" : ""}${badServers.includes(s.index) ? " bad" : ""}`}
                      onClick={() => playNsrServer(s.index)}
                    >
                      {s.name}
                      {badServers.includes(s.index) && <span className="srv-tag">NO FUNCIONA</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function WatchPage({ params }: Props) {
  if (params.type !== "movie" && params.type !== "tv") {
    return (
      <div className="state">
        <h3>Tipo no válido</h3>
        <p>La URL solicitada no existe.</p>
        <Link href="/" className="btn btn-primary">Volver al inicio</Link>
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="watch-loading"><div className="skeleton" style={{ width: "60%", height: 28 }} /></div>}>
      <WatchInner params={params} />
    </Suspense>
  );
}
