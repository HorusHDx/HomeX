export interface VideoServer {
  name: string;
  url: string;
  type: "m3u8" | "mp4" | "embed";
}

const UNLIM_BASE = "https://unlimplay.com";

export const getMovieEmbedUrl = (tmdbId: number | string) =>
  `${UNLIM_BASE}/f/embed/movie/${tmdbId}`;

export const getTvEmbedUrl = (tmdbId: number | string, season: number, episode: number) =>
  `${UNLIM_BASE}/f/embed/tv/${tmdbId}/${season}/${episode}`;

export async function scrapeServers(embedUrl: string): Promise<VideoServer[]> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const servers: VideoServer[] = [];
    const seen = new Set<string>();

    const sourceRegex = /(?:source|src|file|videoUrl|streamUrl|playlist)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
    let match;
    while ((match = sourceRegex.exec(html)) !== null) {
      const url = match[1];
      if (!seen.has(url)) {
        seen.add(url);
        servers.push({
          name: `Servidor ${servers.length + 1}`,
          url: url.startsWith("http") ? url : `${UNLIM_BASE}${url}`,
          type: url.includes(".m3u8") ? "m3u8" : "mp4",
        });
      }
    }

    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
    while ((match = iframeRegex.exec(html)) !== null) {
      const url = match[1];
      if (!seen.has(url) && !url.includes("about:blank")) {
        seen.add(url);
        servers.push({
          name: `Embed ${servers.length + 1}`,
          url: url.startsWith("http") ? url : `${UNLIM_BASE}${url}`,
          type: "embed",
        });
      }
    }

    if (servers.length === 0) {
      servers.push({
        name: "Servidor Principal",
        url: embedUrl,
        type: "embed",
      });
    }

    return servers;
  } catch {
    return [
      {
        name: "Servidor Principal",
        url: embedUrl,
        type: "embed",
      },
    ];
  }
}
