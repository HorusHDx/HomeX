const res = await fetch("https://unlimplay.com/f/embed/tv/1396/1/1", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9",
  },
});
const html = await res.text();
console.log("Status:", res.status);
console.log("Length:", html.length);
console.log("Has finalizePlayer:", html.includes("finalizePlayer"));

const idx = html.indexOf("finalizePlayer");
if (idx >= 0) {
  console.log("Context:", html.substring(idx, idx + 500));
}

const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
if (iframeMatch) console.log("Iframe:", iframeMatch[1]);

const hasNotAvailable = html.includes("no disponible") || html.includes("not available") || html.includes("No results");
console.log("Has 'not available' text:", hasNotAvailable);
