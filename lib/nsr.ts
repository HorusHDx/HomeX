// NSR Play — cliente servidor (la API Key nunca sale del servidor).
// Docs: /embed/sources -> servidores con token de un solo uso (5 min)
//       /embed/resolve -> playUrl (proxy con Referer/UA correctos, CORS *)
// El directUrl viene firmado a la IP de NSR: desde el navegador da 403,
// por eso solo usamos playUrl.

const NSR_BASE = "https://nsrplay.space/api/v1";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
// NSR es lento: /embed/sources suele responder en ~1s, pero /embed/resolve
// se queda colgado (>12s) cuando el proveedor de origen está caído. Timeout
// corto a propósito: los que funcionan contestan en menos de 2s, así que
// esperar más solo hace que el usuario mire una pantalla de carga.
const TIMEOUT_SOURCES = 8000;
const TIMEOUT_RESOLVE = 6000;

export interface NsrServer {
  index: number;
  name: string;
  provider: string;
  lang: "latino" | "castellano" | "subtitulado" | "original";
  label: string;
  // Referencia firmada del pedido (título + proveedor). No lleva el token de
  // un solo uso, así que no caduca: se puede hacer clic en un servidor
  // minutos después y sigue funcionando.
  ref: string;
  // Algunos servidores ya vienen con el proxy resuelto: se reproduce
  // directo sin gastar ninguna llamada extra.
  url?: string;
}

export interface NsrStream {
  url: string;
  format: "hls" | "mp4";
}

interface RawServer {
  name?: string;
  server?: string;
  language?: string;
  token?: string;
  playUrl?: string;
  directUrl?: string;
  isDirectStream?: boolean;
}

function apiKey(): string {
  return process.env.NSR_API_KEY || "";
}

// Sin key el Server2 no puede funcionar: mejor decirlo claro que fallar
// en silencio con un "no hay servidores" que confunde al usuario.
export function isNsrConfigured(): boolean {
  return apiKey().length > 0;
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Referer: "https://nsrplay.space/",
    Accept: "application/json",
  };
  const key = apiKey();
  if (key) h["X-API-Key"] = key;
  return h;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

// Motivos de fallo: se devuelven al cliente para poder diagnosticar por qué
// un servidor no reproduce, en vez de un "no se pudo" sin explicación.
async function apiGet<T>(path: string, timeout: number): Promise<ApiResult<T>> {
  if (!apiKey()) return { ok: false, reason: "sin API Key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${NSR_BASE}${path}`, {
      headers: headers(),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 429) return { ok: false, reason: "límite de peticiones alcanzado" };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "API Key rechazada" };
    if (!res.ok) return { ok: false, reason: `NSR respondió ${res.status}` };

    const json = (await res.json()) as { success?: boolean; message?: string } & T;
    if (json.success === false) {
      return { ok: false, reason: json.message || "NSR devolvió success:false" };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return { ok: false, reason: timedOut ? "NSR tardó demasiado" : "fallo de red" };
  } finally {
    clearTimeout(timer);
  }
}

// --- idioma ---------------------------------------------------------------

const LANG_RANK: Record<NsrServer["lang"], number> = {
  latino: 0,
  castellano: 1,
  subtitulado: 2,
  original: 3,
};

export function normalizeNsrLang(lang: string): NsrServer["lang"] {
  const l = lang.toLowerCase().trim();
  if (!l) return "original";
  if (l === "lat" || l.includes("latino") || l.includes("latam")) return "latino";
  if (l.includes("castellano") || l.includes("espa")) return "castellano";
  if (l.includes("sub")) return "subtitulado";
  return "original";
}

function providerName(s: RawServer): string {
  const p = (s.server || "").trim();
  if (p) return p;
  const n = (s.name || "").trim();
  return n && n.toLowerCase() !== "nsr play" ? n : "NSR Play";
}

// --- sources --------------------------------------------------------------

function sourcesPath(type: "movie" | "tv", id: string, season: number, episode: number): string {
  return type === "movie"
    ? `/embed/sources/movie/${id}?fast=true`
    : `/embed/sources/tv/${id}/${season}/${episode}?fast=true`;
}

export interface NsrTarget {
  type: "movie" | "tv";
  id: string;
  season: number;
  episode: number;
}

export function parseNsrTarget(params: URLSearchParams): NsrTarget | null {
  const type = params.get("type");
  const id = params.get("id") || "";
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return null;
  const season = Math.max(1, parseInt(params.get("season") || "1", 10) || 1);
  const episode = Math.max(1, parseInt(params.get("episode") || "1", 10) || 1);
  return { type, id, season, episode };
}

// Caché corta de la lista de fuentes. Los tokens duran 5 min; 60s alcanza
// para no gastar cuota al saltar entre estados y al reintentar un servidor.
const CACHE_TTL = 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map<string, { at: number; servers: OrderedServer[] }>();

function targetKey(t: NsrTarget): string {
  return `${t.type}/${t.id}/${t.season}/${t.episode}`;
}

// --- ref firmada ----------------------------------------------------------
// La referencia NO lleva el token de un solo uso (que caduca a los 5 min y
// dejaría el botón muerto si el usuario se demora), sino el pedido:
// qué título y qué proveedor quiere. Al canjearlo se pide la lista actual de
// fuentes y se busca ese proveedor, así que siempre funciona, aunque el
// token anterior ya haya vencido. Va firmada con la API Key como secreto
// para que el cliente no pueda inventar pedidos arbitrarios.

interface RefPayload {
  t: NsrTarget;
  p: string;
  l: NsrServer["lang"];
}

async function hmac(input: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signRef(payload: RefPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = (await hmac(body)).slice(0, 32);
  return `${body}.${sig}`;
}

async function readRef(ref: string): Promise<RefPayload | null> {
  const dot = ref.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = ref.slice(0, dot);
  const sig = ref.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[a-f0-9]{32}$/.test(sig)) return null;
  if ((await hmac(body)).slice(0, 32) !== sig) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RefPayload;
    if (!p?.t || (p.t.type !== "movie" && p.t.type !== "tv") || !/^\d+$/.test(p.t.id)) return null;
    if (typeof p.p !== "string" || !p.p) return null;
    if (!Number.isInteger(p.t.season) || !Number.isInteger(p.t.episode)) return null;
    return p;
  } catch {
    return null;
  }
}

// --- sources --------------------------------------------------------------

interface OrderedServer {
  server: RawServer;
  playUrl?: string;
}

// Devuelve los servidores YA ordenados y deduplicados, junto al proxy ya
// resuelto cuando NSR lo manda en la respuesta (así ni siquiera hay que
// canjear el token).
async function orderedRawServers(
  t: NsrTarget
): Promise<{ ok: true; servers: OrderedServer[] } | { ok: false; reason: string }> {
  const key = targetKey(t);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { ok: true, servers: hit.servers };
  if (hit) cache.delete(key);

  const res = await apiGet<{ servers?: RawServer[] }>(
    sourcesPath(t.type, t.id, t.season, t.episode),
    TIMEOUT_SOURCES
  );
  if (!res.ok) return { ok: false, reason: res.reason };
  if (!Array.isArray(res.data.servers)) return { ok: false, reason: "respuesta inesperada" };

  const usable = res.data.servers.filter((s) => typeof s?.token === "string" && s.token.length > 0);

  const seen = new Set<string>();
  const ordered = usable
    .map((s) => ({ s, lang: normalizeNsrLang(s.language || ""), provider: providerName(s) }))
    .sort((a, b) => LANG_RANK[a.lang] - LANG_RANK[b.lang] || a.provider.localeCompare(b.provider))
    .filter((entry) => {
      const k = `${entry.provider}|${entry.lang}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((entry) => ({ server: entry.s, playUrl: entry.s.playUrl }));

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), servers: ordered });
  return { ok: true, servers: ordered };
}

export async function getNsrServers(
  t: NsrTarget
): Promise<{ ok: true; servers: NsrServer[] } | { ok: false; reason: string }> {
  const res = await orderedRawServers(t);
  if (!res.ok) return res;

  const out: NsrServer[] = [];
  for (const entry of res.servers) {
    const s = entry.server;
    out.push({
      index: out.length,
      name: providerName(s),
      provider: providerName(s),
      lang: normalizeNsrLang(s.language || ""),
      label: s.language || "",
      ref: await signRef({ t, p: providerName(s), l: normalizeNsrLang(s.language || "") }),
      ...(entry.playUrl ? { url: entry.playUrl } : {}),
    });
  }
  return { ok: true, servers: out };
}

// --- resolve --------------------------------------------------------------

interface ResolvedNsr {
  stream: NsrStream;
  // Puede no ser el servidor pedido: compiten varios y gana el primero que
  // responde, así el cliente se posiciona en el que sí reproduce.
  index: number;
  name: string;
  lang: NsrServer["lang"];
}

// --- proveedores que se cuelgan -------------------------------------------
// NSR se queda colgado al resolver algunos proveedores (sfastwish, streamtape,
// voesx...) y cada intento cuesta 6s de espera. Recordamos cuáles fallaron
// para no volver a gastar llamadas en ellos durante un rato.
const DEAD_TTL = 5 * 60 * 1000;
const deadProviders = new Map<string, number>();

function isDead(provider: string): boolean {
  const at = deadProviders.get(provider);
  if (at === undefined) return false;
  if (Date.now() - at > DEAD_TTL) {
    deadProviders.delete(provider);
    return false;
  }
  return true;
}

function markDead(provider: string, reason: string): void {
  // Un 429 o un fallo de red no es culpa del proveedor: no se marca.
  if (!/tardó demasiado|sin stream|no tiene stream/i.test(reason)) return;
  if (deadProviders.size > 40) deadProviders.clear();
  deadProviders.set(provider, Date.now());
}

// Cuántos servidores compiten por una reproducción. Dos basta: el pedido y
// el siguiente del mismo idioma.
const RACE = 2;

function toStream(url: string): NsrStream {
  return { url, format: /\.mp4(\?|$)/i.test(url) ? "mp4" : "hls" };
}

function describe(e: OrderedServer, index: number, url: string): ResolvedNsr {
  return {
    stream: toStream(url),
    index,
    name: providerName(e.server),
    lang: normalizeNsrLang(e.server.language || ""),
  };
}

// Canjea la referencia por el stream. Como la ref lleva el pedido (título +
// proveedor) y no el token, se resuelve aunque el usuario haya tardado: se
// lista la fuente actual de ese título y se canjea un token fresco.
export async function resolveNsrRef(
  ref: string
): Promise<{ ok: true } & ResolvedNsr | { ok: false; reason: string }> {
  const payload = await readRef(ref);
  if (!payload) return { ok: false, reason: "referencia inválida" };

  const res = await orderedRawServers(payload.t);
  if (!res.ok) return { ok: false, reason: res.reason };

  const wanted = res.servers.findIndex(
    (e) => providerName(e.server) === payload.p && normalizeNsrLang(e.server.language || "") === payload.l
  );
  if (wanted < 0) return { ok: false, reason: "ese servidor ya no está disponible" };

  // El pedido y los siguientes del mismo idioma, saltando los que ya sabemos
  // que se quedan colgados (para no desperdiciar tiempo/cuota).
  const candidates: number[] = [];
  candidates.push(wanted);
  for (const { i, e } of res.servers.map((e, i) => ({ i, e }))) {
    if (i === wanted) continue;
    if (normalizeNsrLang(e.server.language || "") !== payload.l) continue;
    if (isDead(providerName(e.server))) continue;
    candidates.push(i);
    if (candidates.length >= 1 + RACE) break;
  }

  // NSR a veces manda el proxy ya resuelto: ni siquiera hay que canjear.
  const ready = candidates.find((i) => res.servers[i].playUrl);
  if (ready !== undefined) {
    return { ok: true, ...describe(res.servers[ready], ready, res.servers[ready].playUrl!) };
  }

  // Promise.any devuelve en cuanto UNO responde.
  const winner = await Promise.any(
    candidates.map(async (i) => {
      const p = providerName(res.servers[i].server);
      const r = await apiGet<{ data?: { playUrl?: string; directUrl?: string } }>(
        `/embed/resolve?token=${encodeURIComponent(res.servers[i].server.token!)}`,
        TIMEOUT_RESOLVE
      );
      if (!r.ok) {
        markDead(p, r.reason);
        throw new Error(r.reason);
      }
      const url = r.data?.data?.playUrl;
      if (!url) {
        markDead(p, "sin stream");
        throw new Error("ese servidor no tiene stream disponible");
      }
      return { i, url };
    })
  ).catch((err: unknown) => {
    const reasons = (err as { errors?: unknown[] })?.errors;
    const first = Array.isArray(reasons) ? reasons.find((e): e is Error => e instanceof Error) : null;
    return { failed: first?.message || "ningún servidor respondió" };
  });

  if ("failed" in winner) return { ok: false, reason: winner.failed };
  return { ok: true, ...describe(res.servers[winner.i], winner.i, winner.url) };
}
