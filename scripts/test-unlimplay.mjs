const res = await fetch("https://unlimplay.com/f/embed/movie/1226863", {
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
  console.log("Context:", html.substring(idx, idx + 300));
} else {
  console.log("finalizePlayer NOT FOUND");
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
  if (iframeMatch) console.log("Iframe found:", iframeMatch[1]);
  const sourceMatch = html.match(/source\s*[:=]\s*["']([^"']+)["']/i);
  if (sourceMatch) console.log("Source found:", sourceMatch[1]);
}
