"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VideoServer, getMovieEmbedUrl, getTvEmbedUrl } from "@/lib/unlimplay";

interface Props {
  params: { type: "movie" | "tv"; id: string };
}

export default function WatchPage({ params }: Props) {
  const searchParams = useSearchParams();
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  const [servers, setServers] = useState<VideoServer[]>([]);
  const [activeServer, setActiveServer] = useState<VideoServer | null>(null);
  const [loading, setLoading] = useState(true);

  const embedUrl =
    params.type === "movie"
      ? getMovieEmbedUrl(params.id)
      : getTvEmbedUrl(params.id, parseInt(season), parseInt(episode));

  useEffect(() => {
    fetch(`/api/servers?type=${params.type}&id=${params.id}&season=${season}&episode=${episode}`)
      .then((r) => r.json())
      .then((data) => {
        setServers(data.servers || []);
        setActiveServer(data.servers?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.type, params.id, season, episode]);

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="flex-1">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : activeServer ? (
          activeServer.type === "embed" ? (
            <iframe
              src={activeServer.url}
              className="h-[70vh] w-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              src={activeServer.url}
              controls
              autoPlay
              className="h-[70vh] w-full"
            />
          )
        ) : (
          <div className="flex h-[70vh] items-center justify-center text-gray-400">
            No se encontraron servidores
          </div>
        )}
      </div>

      {servers.length > 1 && (
        <div className="border-t border-white/10 bg-surface p-4">
          <p className="mb-2 text-sm text-gray-400">Servidores disponibles:</p>
          <div className="flex flex-wrap gap-2">
            {servers.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveServer(s)}
                className={`rounded px-4 py-2 text-sm font-medium transition ${
                  activeServer?.url === s.url
                    ? "bg-brand text-white"
                    : "bg-surface-light text-gray-300 hover:bg-white/10"
                }`}
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
