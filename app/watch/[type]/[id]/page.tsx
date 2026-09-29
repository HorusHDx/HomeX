"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScrapedServer, getMovieEmbedUrl, getTvEmbedUrl } from "@/lib/unlimplay";
import { markWatched } from "@/lib/continue";

interface Props {
  params: { type: "movie" | "tv"; id: string };
}

const LANG_ORDER = ["latino", "castellano", "espanol", "español", "subtitulado", "original"];

function normalizeLang(lang: string): string {
  const l = lang.toLowerCase().trim();
  if (l.includes("latino") || l.includes("mexico") || l.includes("mx")) return "Audio Latino Mx";
  if (l.includes("castellano") || l.includes("español") || l.includes("espanol")) return "Audio Castellano Esp";
  if (l.includes("sub")) return "Audio Original Subtitulado";
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

export default function WatchPage({ params }: Props) {
  const searchParams = useSearchParams();
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  const [servers, setServers] = useState<ScrapedServer[]>([]);
  const [activeServer, setActiveServer] = useState<ScrapedServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const embedUrl =
    params.type === "movie"
      ? getMovieEmbedUrl(params.id)
      : getTvEmbedUrl(params.id, parseInt(season), parseInt(episode));

  useEffect(() => {
    setLoading(true);
    setActiveServer(null);
    fetch(`/api/servers?type=${params.type}&id=${params.id}&season=${season}&episode=${episode}`)
      .then((r) => r.json())
      .then((data) => {
        const srv = data.servers || [];
        setServers(srv);
        setActiveServer(srv[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.type, params.id, season, episode]);

  useEffect(() => {
    if (params.type === "tv" && servers.length > 0) {
      markWatched(
        { id: Number(params.id), media: "tv", title: params.id, poster: null },
        parseInt(season),
        parseInt(episode)
      );
    }
  }, [params.type, params.id, season, episode, servers.length]);

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

  return (
    <div className={`watch${isFull ? " css-full" : ""}`}>
      <div className="watch-top">
        <Link href={`/detail/${params.type}/${params.id}`} className="watch-back">
          ← Volver
        </Link>
        <div className="watch-title">
          <h1>{params.type === "movie" ? "Película" : `T${season} E${episode}`}</h1>
        </div>
        <button className="watch-fullbtn" onClick={toggleFull}>
          {isFull ? "Salir" : "Pantalla completa"}
        </button>
      </div>

      <div className="watch-frame" ref={frameRef}>
        {loading && (
          <div className="watch-loading">
            <div className="skeleton" style={{ width: "60%", height: 28 }} />
            <div className="skeleton" style={{ width: "40%", height: 16 }} />
          </div>
        )}

        {!loading && !activeServer && (
          <div className="state">
            <h3>Sin servidores disponibles</h3>
            <p>Este título no tiene ningún servidor online ahora mismo.</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}

        {activeServer && (
          <iframe
            key={activeServer.url}
            src={activeServer.url}
            title="Video"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>

      {groups.map((group) => (
        <div className="watch-audio" key={group.lang}>
          <h2 className="watch-audio-title">{group.lang}</h2>
          <div className="watch-audio-list">
            {group.items.map((s, i) => (
              <button
                key={i}
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
                key={i}
                className={`watch-server${activeServer?.url === s.url ? " on" : ""}`}
                onClick={() => setActiveServer(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
