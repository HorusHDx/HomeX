"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TMDBEpisode, imgUrl } from "@/lib/tmdb";

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string;
}

interface Props {
  tvId: string;
  seasons: Season[];
}

export default function SeasonClient({ tvId, seasons }: Props) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tmdb/tv/${tvId}/season/${activeSeason}`)
      .then((r) => r.json())
      .then((data) => {
        setEpisodes(data.episodes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tvId, activeSeason]);

  return (
    <div>
      <div className="season-tabs">
        {seasons.map((s) => (
          <button
            key={s.season_number}
            className={`season-tab${activeSeason === s.season_number ? " on" : ""}`}
            onClick={() => setActiveSeason(s.season_number)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="episode-list">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      ) : (
        <div className="episode-list">
          {episodes.map((ep) => (
            <Link
              key={ep.id}
              href={`/watch/tv/${tvId}?season=${activeSeason}&episode=${ep.episode_number}`}
              className="episode-item"
            >
              <div className="episode-num">{ep.episode_number}</div>
              <div className="episode-thumb">
                {ep.still_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl(ep.still_path, "w500")!}
                    alt={ep.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="skeleton" style={{ width: "100%", aspectRatio: "16/9" }} />
                )}
              </div>
              <div className="episode-info">
                <h3>{ep.name}</h3>
                <p>{ep.overview || "Sin descripción"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
