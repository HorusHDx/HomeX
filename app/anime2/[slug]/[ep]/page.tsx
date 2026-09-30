"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Anime2Info, Anime2Server } from "@/lib/animeav1";
import { markAnime2Watched } from "@/lib/continue";

interface Props {
  params: { slug: string; ep: string };
}

const LANG_ORDER = ["latino", "subtitulado"];
const LANG_LABELS: Record<string, string> = {
  latino: "Doblado Latino",
  subtitulado: "Subtitulado",
};

export default function Anime2WatchPage({ params }: Props) {
  const ep = Math.max(1, parseInt(params.ep, 10) || 1);
  const [servers, setServers] = useState<Anime2Server[]>([]);
  const [active, setActive] = useState<Anime2Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(params.slug);
  const [cover, setCover] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActive(null);
    Promise.all([
      fetch(`/api/anime2/episode?slug=${encodeURIComponent(params.slug)}&episode=${ep}`).then((r) => r.json()),
      fetch(`/api/anime2/info?slug=${encodeURIComponent(params.slug)}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([srv, info]: [any, Anime2Info | null]) => {
        if (cancelled) return;
        const list = (srv.servers || []) as Anime2Server[];
        setServers(list);
        setActive(list[0] || null);
        if (info?.title) setTitle(info.title);
        if (info?.cover) setCover(info.cover);
        if (info?.episodes) setEpisodes(info.episodes);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug, ep]);

  useEffect(() => {
    if (title && title !== params.slug) {
      markAnime2Watched({ slug: params.slug, title, cover }, ep);
    }
  }, [params.slug, title, cover, ep]);

  const groups = LANG_ORDER.map((lang) => ({
    lang,
    items: servers.filter((s) => s.lang === lang),
  })).filter((g) => g.items.length > 0);
  const ungrouped = servers.filter((s) => !LANG_ORDER.includes(s.lang));

  const idx = episodes.indexOf(ep);
  const prev = idx > 0 ? episodes[idx - 1] : null;
  const next = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null;

  return (
    <div className="watch">
      <div className="watch-top">
        <Link href={`/anime2/${params.slug}`} className="watch-back">
          ← Episodios
        </Link>
        <div className="watch-title">
          <h1>{title} · E{ep}</h1>
        </div>
      </div>

      <div className="watch-frame">
        {loading && (
          <div className="watch-loading">
            <div className="skeleton" style={{ width: "60%", height: 28 }} />
            <div className="skeleton" style={{ width: "40%", height: 16 }} />
          </div>
        )}
        {!loading && !active && (
          <div className="state">
            <h3>Sin servidores disponibles</h3>
            <p>Este episodio no tiene servidores online ahora mismo.</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}
        {active && (
          <iframe
            key={active.url}
            src={active.url}
            title="Video"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {episodes.length > 0 && (
        <div className="watch-nav">
          {prev ? (
            <Link href={`/anime2/${params.slug}/${prev}`} className="watch-navbtn">← Anterior</Link>
          ) : (
            <button className="watch-navbtn" disabled>← Anterior</button>
          )}
          <span className="watch-nav-pos">Episodio {ep}</span>
          {next ? (
            <Link href={`/anime2/${params.slug}/${next}`} className="watch-navbtn">Siguiente →</Link>
          ) : (
            <button className="watch-navbtn" disabled>Siguiente →</button>
          )}
        </div>
      )}

      {groups.map((g) => (
        <div className="watch-audio" key={g.lang}>
          <h2 className="watch-audio-title">{LANG_LABELS[g.lang] || g.lang}</h2>
          <div className="watch-audio-list">
            {g.items.map((s, i) => (
              <button
                key={`${s.url}-${i}`}
                className={`watch-server${active?.url === s.url ? " on" : ""}`}
                onClick={() => setActive(s)}
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
                className={`watch-server${active?.url === s.url ? " on" : ""}`}
                onClick={() => setActive(s)}
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
