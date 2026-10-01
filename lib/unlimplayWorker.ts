// Cliente del Worker de Unlimplay (edge de Cloudflare).
//
// El Worker hace el scrapeo y el cacheo en el edge; si no esta configurado o
// no responde, la app sigue con el scrapeo directo desde Vercel. Asi el Worker
// es una mejora de velocidad/estabilidad, nunca un punto unico de fallo.

import type { ScrapedServer } from "./unlimplay";

const WORKER_URL = (process.env.UNLIMPLAY_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_TOKEN = process.env.UNLIMPLAY_WORKER_TOKEN || "";

// El Worker responde en cache en ~10ms, pero un scrape en frio puede tardar
// 5-6s. 8s deja margen sin dejar al usuario esperando de mas.
const TIMEOUT = 8000;

export function workerConfigured(): boolean {
  return WORKER_URL.length > 0;
}

interface WorkerBody {
  servers?: unknown;
  noSources?: unknown;
}

function isServer(v: unknown): v is ScrapedServer {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s.name === "string" && typeof s.url === "string" && typeof s.lang === "string";
}

// Devuelve null si el Worker no esta disponible o responde algo raro, para
// que el llamador pueda usar el scrapeo directo.
export async function scrapeServersFromWorker(
  type: "movie" | "tv",
  id: string,
  season: number,
  episode: number
): Promise<ScrapedServer[] | null> {
  if (!WORKER_URL) return null;

  const qs = new URLSearchParams({
    type,
    id,
    season: String(season),
    episode: String(episode),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${WORKER_URL}/?${qs}`, {
      headers: WORKER_TOKEN ? { "x-worker-token": WORKER_TOKEN } : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as WorkerBody;
    if (!Array.isArray(body.servers)) return null;
    return body.servers.filter(isServer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
