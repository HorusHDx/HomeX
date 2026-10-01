// HomeX — Worker de Unlimplay (Server1)
//
// Corre en el edge de Cloudflare: scrapea la pagina embed de Unlimplay,
// saca la lista de servidores y la devuelve ya normalizada. Ventajas frente
// a hacerlo desde Vercel:
//
//   1. Las IPs de salida son de Cloudflare, no de un datacenter compartido:
//      muchos WAF los bloquean a los primeros y no a las segundas.
//   2. La Cache API guarda el resultado en el edge: el primer visitante
//      scrapea, el resto recibe la respuesta en milisegundos.
//   3. Se sirve con stale-while-revalidate: cuando la copia envejece se
//      devuelve igual y se refresca por detras, sin bloquear a nadie.
//
// Contrato (compatible con el formato de referencia rs.arcando.cloud y con
// la app):
//   GET /?type=movie&id=550
//   GET /?type=tv&id=1396&season=1&episode=2
//   GET /extract?id=550&type=movie
//   GET /extract?id=1396&type=tv&s=1&e=2
//   GET /movie/550
//   GET /tv/1396/1/2
//   GET /health
//   -> { servers: [{ name, url, lang }], embedUrl, noSources }
//
// Si se define el secreto WORKER_TOKEN, todas las peticiones (menos
// /health) deben traer la cabecera x-worker-token. Sin eso el Worker seria
// un proxy abierto que cualquiera podria usar para generar trafico.

const UNLIM_BASE = "https://unlimplay.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CACHE_KEY_PREFIX = "https://cache.homex.local/unlimplay/";
// Quanto tiempo vale una respuesta fresca y cuanto se puede seguir sirviendo
// mientras se regenera sola por detras.
// Los TTL se pueden ajustar con vars en wrangler.toml (util para probar el
// refresco en segundo plano sin esperar 15 minutos).
function envInt(value, fallback) {
  const n = parseInt(value || "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

const FRESH_S = 900; // 15 min
const STALE_S = 86400; // 24 h
// Un scrape sin servidores suele ser un fallo temporal de su scraper: se
// cachean poco para no quedarnos sin nada si vuelve a funcionar.
const EMPTY_FRESH_S = 60;
const EMPTY_STALE_S = 600;

const FETCH_TIMEOUT_MS = 8000;
const HTML_LIMIT = 2 * 1024 * 1024;
const MAX_OBJECT_SCAN = 60000;

// ---------------------------------------------------------------- utilidades

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}

function normKey(url) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

const LANG_PRIORITY = ["latino", "castellano", "subtitulado", "original"];

function langRank(lang) {
  const l = lang.toLowerCase().trim();
  const i = LANG_PRIORITY.indexOf(l);
  if (i >= 0) return i;
  if (l.includes("latino")) return 0;
  if (l.includes("castellano") || l.includes("espa")) return 1;
  if (l.includes("sub")) return 2;
  return 99;
}

function isDirectMedia(url) {
  const variants = [url];
  try {
    variants.push(decodeURIComponent(url));
  } catch {}
  return variants.some(
    (u) =>
      /\.(m3u8|mp4|mkv|webm|m4v)(\?|#|&|%|\/|$)/i.test(u) ||
      /[?&](url|src|file|stream_url|playlist)=/i.test(u)
  );
}

const IFRAME_BLOCKLIST = ["google.", "gstatic.", "facebook.", "cloudflare", "hcaptcha.", "recaptcha"];

function isBlockedIframe(url) {
  const l = url.toLowerCase();
  return IFRAME_BLOCKLIST.some((b) => l.includes(b));
}

// ------------------------------------------------------------- parse del HTML

// El JSON real va al final del HTML; buscar de atras hacia adelante evita
// parsear CSS/JS intermedio (mas rapido y menos falsos positivos).
function readBalancedObject(html, open) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const end = Math.min(html.length, open + MAX_OBJECT_SCAN);

  for (let i = open; i < end; i++) {
    const ch = html[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(html.slice(open, i + 1));
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const NON_LANG_KEYS = new Set(["searched_names"]);

function collect(data) {
  const out = [];
  const seen = new Set();

  for (const [lang, value] of Object.entries(data)) {
    if (NON_LANG_KEYS.has(lang)) continue;
    if (!value || typeof value !== "object") continue;

    for (const [name, rawUrl] of Object.entries(value)) {
      if (typeof rawUrl !== "string") continue;
      const url = rawUrl.trim();
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      if (isDirectMedia(url)) continue;
      const key = normKey(url);
      if (seen.has(key)) continue;

      seen.add(key);
      out.push({ name: name.trim() || "Server", url, lang });
    }
  }

  // Latino primero: el player auto-selecciona servers[0]
  out.sort((a, b) => langRank(a.lang) - langRank(b.lang) || a.name.localeCompare(b.name));
  return out;
}

function extractServers(html, marker) {
  const indices = [];
  for (let at = html.indexOf(marker); at >= 0; at = html.indexOf(marker, at + 1)) {
    indices.push(at);
  }
  for (let k = indices.length - 1; k >= 0; k--) {
    const open = html.indexOf("{", indices[k] + marker.length);
    if (open < 0) continue;
    const parsed = readBalancedObject(html, open);
    if (!parsed) continue;
    const servers = collect(parsed);
    if (servers.length > 0) return servers;
  }
  return [];
}

function extractIframes(html) {
  const out = [];
  const seen = new Set();
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let match;

  while ((match = iframeRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url || url.includes("about:blank")) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (isDirectMedia(url)) continue;
    if (isBlockedIframe(url)) continue;
    const key = normKey(url);
    if (seen.has(key)) continue;

    seen.add(key);
    out.push({ name: `Embed ${out.length + 1}`, url, lang: "original" });
  }

  return out;
}

// ------------------------------------------------------------------- scrape

async function fetchHtml(embedUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": UA,
        Referer: `${UNLIM_BASE}/`,
        "Accept-Language": "es-ES,es;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        // Imprescindible: el WAF de Unlimplay solo deja pasar a quien finge
        // ser la navegacion real de un <iframe> embebido. Sin Sec-Fetch-Dest
        // responden 403 "Acceso Bloqueado" y no hay ningun servidor.
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, html: "" };
    const html = await res.text();
    return { status: res.status, html: html.length > HTML_LIMIT ? "" : html };
  } catch {
    return { status: 0, html: "" };
  } finally {
    clearTimeout(timer);
  }
}

function fallbackServer(embedUrl) {
  return [{ name: "Servidor Principal", url: embedUrl, lang: "original" }];
}

// Devuelve { servers, noSources, status } con status != 200 solo en 404.
async function scrape(embedUrl) {
  // 2 intentos solo ante fallos transitorios (timeout/red/5xx). Un 404 es
  // definitivo: el titulo no existe, sin reintento.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { status, html } = await fetchHtml(embedUrl);

    if (status === 404) return { servers: [], noSources: true, status: 404 };
    if (!html) {
      if (status >= 500 && attempt === 0) continue;
      if (status === 0 && attempt === 0) continue;
      return { servers: status >= 500 ? fallbackServer(embedUrl) : [], noSources: true, status };
    }

    const servers = extractServers(html, "finalizePlayer(");
    if (servers.length > 0) return { servers, noSources: false, status };

    const iframes = extractIframes(html);
    if (iframes.length > 0) return { servers: iframes, noSources: false, status };

    // 200 con HTML parseable pero sin datos: determinista, no reintentar.
    return { servers: fallbackServer(embedUrl), noSources: true, status };
  }

  return { servers: fallbackServer(embedUrl), noSources: true, status: 0 };
}

// -------------------------------------------------------------------- cache

async function cacheGet(cache, key) {
  const hit = await cache.match(key);
  if (!hit) return null;
  try {
    return await hit.json();
  } catch {
    return null;
  }
}

async function cachePut(cache, key, entry) {
  // Cache API exige ttl > 0; guardamos hasta el final de la ventana stale.
  const ttl = Math.max(1, entry.staleUntil - Date.now() / 1000);
  await cache.put(
    key,
    new Response(JSON.stringify(entry), {
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${Math.ceil(ttl)}`,
      },
    })
  );
}

// ------------------------------------------- resolucion directa wish-family
// Los embeds de Unlimplay que mas fallan en iframe (doodstream, filemoon,
// streamwish, filelions...) esconden el m3u8 en un JS empaquetado
// (p-a-c-k-e-r). Resolverlo aqui y servirlo directo evita montar iframes
// que solo muestran publicidad o error. Patron copiado de la referencia
// (rs.arcando.cloud): /stream (302 al m3u8) + /proxyvideo (proxy CORS).

const WISH_HOSTS = [
  "morencius.com",
  "embedwish.com",
  "bysejikuar.com",
  "filelions.",
  "streamwish.",
  "vidhide",
  "filemoon",
];

function isWishEmbed(url) {
  const l = url.toLowerCase();
  return WISH_HOSTS.some((h) => l.includes(h));
}

async function fetchText(url, referer, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer } : {}),
        "Accept-Language": "es-ES,es;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > HTML_LIMIT ? null : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Lee una cadena '...' manejando escapes. start apunta a la comilla inicial.
function readQString(s, start) {
  let out = "";
  let k = start + 1;
  while (k < s.length) {
    const ch = s[k];
    if (ch === "\\" && k + 1 < s.length) {
      out += s[k + 1];
      k += 2;
      continue;
    }
    if (ch === "'") return { value: out, end: k };
    out += ch;
    k++;
  }
  return null;
}

// Localiza eval(function(p,a,c,k,e,d){...}(...)) balanceando parentesis.
function findPackedCall(html) {
  const start = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let k = start + 4; k < html.length; k++) {
    const ch = html[k];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") inStr = true;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return html.slice(start, k + 1);
    }
  }
  return null;
}

const PACKER_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function packerEncode(n, a) {
  let s = "";
  do {
    s = PACKER_ALPHABET[n % a] + s;
    n = Math.floor(n / a);
  } while (n > 0);
  return s;
}

// Desempaqueta Dean Edwards p-a-c-k-e-r. Devuelve el codigo o null.
function unpackPacker(call) {
  const ps = call.indexOf("}('");
  if (ps < 0) return null;
  const p = readQString(call, ps + 2);
  if (!p) return null;
  const m = call.slice(p.end + 1, p.end + 80).match(/^,(\d+),(\d+),'/);
  if (!m) return null;
  const ks = readQString(call, p.end + m[0].length);
  if (!ks) return null;
  const kws = ks.value.split("|");
  const a = parseInt(m[1], 10);
  const c = parseInt(m[2], 10);
  const dict = {};
  for (let x = c - 1; x >= 0; x--) {
    if (kws[x]) dict[packerEncode(x, a)] = kws[x];
  }
  return p.value.replace(/\b\w+\b/g, (w) => (dict[w] !== undefined ? dict[w] : w));
}

function extractM3u8(code) {
  const found = [...code.matchAll(/"(https?:[^"]*?\.m3u8[^"]*)"/g)].map((x) => x[1]);
  // Los master con urlset son los preferidos: traen todas las calidades.
  found.sort((x, y) => (y.includes("urlset") ? 1 : 0) - (x.includes("urlset") ? 1 : 0));
  return found.length ? found[0] : null;
}

// Resuelve un embed wish-family a su m3u8 y lo verifica con 1 byte.
// Devuelve { url } o { error } con el motivo, para poder diagnosticar.
async function resolveWishEmbed(embedUrl, explain) {
  const html = await fetchText(embedUrl, `${UNLIM_BASE}/`, FETCH_TIMEOUT_MS);
  if (!html) return { error: "embed sin respuesta" };
  const call = findPackedCall(html);
  if (!call) return { error: "sin player empaquetado" };
  const code = unpackPacker(call);
  if (!code) return { error: "no se pudo desempaquetar" };
  const m3u8 = extractM3u8(code);
  if (!m3u8) return { error: "sin m3u8 en el codigo" };
  if (explain) explain.found = m3u8.slice(0, 80);

  // Verificacion barata: pedimos 1 byte con el referer del embed.
  try {
    const host = new URL(embedUrl).origin + "/";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(m3u8, {
      headers: { "User-Agent": UA, Referer: host, Range: "bytes=0-1" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    await res.arrayBuffer().catch(() => null);
    if (res.status !== 200 && res.status !== 206) return { error: `CDN respondio ${res.status}` };
    return { url: m3u8 };
  } catch {
    return { error: "CDN sin respuesta" };
  }
}

// ------------------------------------------------------------------ /stream
// Cache corta para directos: el token del CDN caduca, asi que no se guarda
// por horas como la lista (15 min) sino por minutos.
const STREAM_FRESH_S = 300;
const STREAM_STALE_S = 900;

function streamCacheKey(origin, type, id, season, episode, lang) {
  return `${CACHE_KEY_PREFIX}stream/${type}/${id}/${season}/${episode}/${lang}`;
}

// Elige candidatos: primero el idioma pedido y que sean wish-family
// (resolubles), despues el resto del mismo idioma.
function pickCandidates(servers, lang) {
  const wanted = servers.filter((s) => s.lang === lang);
  const rest = servers.filter((s) => s.lang !== lang);
  const rank = (s) => (isWishEmbed(s.url) ? 0 : 1);
  return [...wanted, ...rest].sort((a, b) => rank(a) - rank(b)).slice(0, 4);
}

// /stream?type=movie&id=550&lang=latino -> 302 al m3u8 directo.
// ?format=json -> { url, provider, lang } en vez de redirigir.
async function handleStream(url, env, request) {
  let type = (url.searchParams.get("type") || "").toLowerCase();
  if (type === "movies") type = "movie";
  if (type === "tvshows" || type === "series") type = "tv";
  const id = url.searchParams.get("id") || "";
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) {
    return json({ error: "Parametros invalidos: type, id" }, 400);
  }
  const season = Math.max(1, parseInt(url.searchParams.get("s") || url.searchParams.get("season") || "1", 10) || 1);
  const episode = Math.max(1, parseInt(url.searchParams.get("e") || url.searchParams.get("episode") || "1", 10) || 1);
  const lang = (url.searchParams.get("lang") || "latino").toLowerCase();
  const asJson = (url.searchParams.get("format") || "").toLowerCase() === "json";

  const respond = (found) => {
    if (!found) {
      return json({ error: "Ningun servidor resoluble ahora mismo", type, id, season, episode }, 404);
    }
    if (asJson) {
      return json({ url: found.url, provider: found.name, lang: found.lang, type, id });
    }
    return Response.redirect(found.url, 302);
  };

  const cache = caches.default;
  const key = streamCacheKey(url.origin, type, id, season, episode, lang);
  const now = Date.now() / 1000;
  const cached = await cacheGet(cache, key);
  if (cached && now < cached.freshUntil) {
    return respond(cached.body);
  }

  const embedUrl = embedUrlFor(type, id, season, episode);
  const result = await scrape(embedUrl);
  const real = result.servers.filter(
    (s) => !(s.name === "Servidor Principal" && s.url === embedUrl)
  );
  if (!real.length) {
    return json({ error: "Sin servidores para este titulo", type, id }, 404);
  }

  const candidates = pickCandidates(real, lang);
  const debug = (url.searchParams.get("debug") || "") === "1";
  const attempts = [];
  const winner = await Promise.any(
    candidates.map(async (s) => {
      const info = {};
      const r = await resolveWishEmbed(s.url, debug ? info : undefined);
      if (!r.url) {
        if (debug) attempts.push({ server: s.name, error: r.error, found: info.found || null });
        throw new Error(r.error);
      }
      return { url: r.url, name: s.name, lang: s.lang };
    })
  ).catch(() => null);

  if (!winner && debug) {
    return json({ error: "Ningun servidor resoluble ahora mismo", type, id, attempts }, 404);
  }

  if (winner) {
    const entry = { at: Math.round(now), freshUntil: Math.round(now) + STREAM_FRESH_S, staleUntil: Math.round(now) + STREAM_STALE_S, body: winner };
    try {
      await cachePut(cache, key, entry);
    } catch {}
  }
  return respond(winner);
}

// -------------------------------------------------------------- /proxyvideo
// ?url=<m3u8 o ts>&ref=<embed de origen> — CORS abierto para el player.
// Los m3u8 se reescriben para que listas y segmentos pasen por aqui.
function proxied(origin, target, ref) {
  return `${origin}/proxyvideo?url=${encodeURIComponent(target)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
}

function rewriteM3u8(body, base, origin, ref) {
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) {
        // Las URIs pueden venir en atributos: URI="...".
        return line.replace(/URI="([^"]+)"/g, (mm, u) => {
          try {
            return `URI="${proxied(origin, new URL(u, base).toString(), ref)}"`;
          } catch {
            return mm;
          }
        });
      }
      try {
        return proxied(origin, new URL(t, base).toString(), ref);
      } catch {
        return line;
      }
    })
    .join("\n");
}

async function handleProxyVideo(url) {
  const target = url.searchParams.get("url") || "";
  const ref = url.searchParams.get("ref") || "";
  if (!/^https?:\/\//i.test(target)) {
    return json({ error: "Parametro url invalido" }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        ...(ref ? { Referer: ref } : {}),
        Accept: "*/*",
      },
      signal: controller.signal,
    });
    if (!upstream.ok || !upstream.body) {
      return json({ error: `Origen respondio ${upstream.status}` }, 502);
    }

    const ct = (upstream.headers.get("content-type") || "").toLowerCase();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "*",
      "cache-control": "public, max-age=30",
    };

    if (ct.includes("mpegurl") || target.includes(".m3u8")) {
      const text = await upstream.text();
      const out = rewriteM3u8(text, target, url.origin, ref);
      return new Response(out, {
        headers: { ...headers, "content-type": "application/vnd.apple.mpegurl" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        ...headers,
        "content-type": upstream.headers.get("content-type") || "application/octet-stream",
        ...(upstream.headers.get("content-length")
          ? { "content-length": upstream.headers.get("content-length") }
          : {}),
      },
    });
  } catch {
    return json({ error: "El origen no respondio" }, 504);
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------- router

function embedUrlFor(type, id, season, episode) {
  return type === "movie"
    ? `${UNLIM_BASE}/f/embed/movie/${id}`
    : `${UNLIM_BASE}/f/embed/tv/${id}/${season}/${episode}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Solo GET" }, 405, { allow: "GET, HEAD" });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "homex-unlimplay", edge: request.cf?.colo || null });
    }

    // Formato estilo referencia (rs.arcando.cloud): /extract y rutas por path.
    // Se normalizan a type/id/season/episode y siguen el mismo flujo + cache.
    let type = url.searchParams.get("type");
    let id = url.searchParams.get("id") || "";
    let seasonRaw = url.searchParams.get("season") || url.searchParams.get("s") || "";
    let episodeRaw = url.searchParams.get("episode") || url.searchParams.get("e") || "";

    const path = url.pathname.replace(/\/+$/, "") || "/";
    let m = path.match(/^\/movie\/(\d+)$/);
    if (m) {
      type = "movie";
      id = m[1];
    }
    m = path.match(/^\/tv\/(\d+)\/(\d+)\/(\d+)$/);
    if (m) {
      type = "tv";
      id = m[1];
      seasonRaw = m[2];
      episodeRaw = m[3];
    }
    // /extract acepta type=movie|tv o type=movies|tvshows|series|anime (alias).
    if (path === "/extract") {
      const t = (url.searchParams.get("type") || "").toLowerCase();
      if (t === "movies" || t === "movie") type = "movie";
      else if (t === "tv" || t === "tvshows" || t === "series" || t === "anime") type = "tv";
      else type = t || type;
      const rawId = url.searchParams.get("id") || "";
      // Solo aceptamos IDs numericos TMDB; los IMDB (tt...) no los resuelve
      // Unlimplay por /f/embed, asi que se rechazan con 400 claro.
      if (/^\d+$/.test(rawId)) id = rawId;
      else if (rawId) return json({ error: "Solo IDs numericos TMDB (los IMDB tt... no los acepta Unlimplay)" }, 400);
    }

    // Sin secreto el Worker queda abierto a cualquiera: no es lo que queremos.
    if (env.WORKER_TOKEN) {
      const given = request.headers.get("x-worker-token") || url.searchParams.get("token") || "";
      if (given !== env.WORKER_TOKEN) {
        return json({ error: "No autorizado" }, 401);
      }
    }

    // /stream redirige (302) al m3u8 directo del mejor servidor, como la
    // referencia. ?format=json devuelve el dato en vez de redirigir.
    // ?lang filtra idioma (latino por defecto).
    if (path === "/stream") {
      return handleStream(url, env, request);
    }

    // /proxyvideo?url=...&ref=... sirve el m3u8 o segmento con CORS abierto,
    // reescribiendo las URLs internas para que todo pase por aqui.
    if (path === "/proxyvideo") {
      return handleProxyVideo(url);
    }

    if (path !== "/" && path !== "/extract" && !/^\/movie\/\d+$/.test(path) && !/^\/tv\/\d+\/\d+\/\d+$/.test(path)) {
      return json({ error: "Ruta no encontrada. Usa /extract, /movie/:id, /tv/:id/:s/:e, /stream o /proxyvideo" }, 404);
    }

    if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) {
      return json({ error: "Parametros invalidos: type, id" }, 400);
    }

    const season = Math.max(1, parseInt(seasonRaw || "1", 10) || 1);
    const episode = Math.max(1, parseInt(episodeRaw || "1", 10) || 1);
    if (type === "tv" && (season < 1 || episode < 1)) {
      return json({ error: "Parametros invalidos: season, episode" }, 400);
    }

    const embedUrl = embedUrlFor(type, id, season, episode);
    const cacheKey = `${CACHE_KEY_PREFIX}${type}/${id}/${season}/${episode}`;
    const cache = caches.default;

    const cached = await cacheGet(cache, cacheKey);
    const now = Date.now() / 1000;

    if (cached && now < cached.freshUntil) {
      return json(cached.body, 200, { "x-cache": "HIT", age: Math.round(now - cached.at) });
    }

    const refresh = async () => {
      const result = await scrape(embedUrl);
      // El embed generico no cuenta como fuente real: sin esto la app creeria
      // que hay servidores y montaria un iframe que solo dice "no encontrado".
      const real = result.servers.filter(
        (s) => !(s.name === "Servidor Principal" && s.url === embedUrl)
      );
      const noSources = real.length === 0 || result.status === 404;
      const body = { servers: result.servers, embedUrl, noSources };
      const fresh = noSources
        ? envInt(env.CACHE_EMPTY_FRESH_S, EMPTY_FRESH_S)
        : envInt(env.CACHE_FRESH_S, FRESH_S);
      const stale = noSources
        ? envInt(env.CACHE_EMPTY_STALE_S, EMPTY_STALE_S)
        : envInt(env.CACHE_STALE_S, STALE_S);
      const entry = {
        at: Math.round(now),
        freshUntil: Math.round(now) + fresh,
        staleUntil: Math.round(now) + stale,
        body,
      };
      try {
        await cachePut(cache, cacheKey, entry);
      } catch {}
      return entry;
    };

    // Copia vieja todavia servible: se responde al instante y se refresca
    // por detras. Nadie espera al scrape.
    if (cached && now < cached.staleUntil) {
      ctx.waitUntil(refresh());
      return json(cached.body, 200, { "x-cache": "STALE" });
    }

    try {
      const entry = await refresh();
      return json(entry.body, 200, { "x-cache": "MISS" });
    } catch (err) {
      return json({ error: `Fallo del worker: ${String(err).slice(0, 120)}` }, 500);
    }
  },
};
