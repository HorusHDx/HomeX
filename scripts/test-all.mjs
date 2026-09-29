const tests = [
  { name: "Mario Movie", url: "https://unlimplay.com/f/embed/movie/1226863" },
  { name: "Breaking Bad T1E1", url: "https://unlimplay.com/f/embed/tv/1396/1/1" },
  { name: "Attack on Titan T1E1", url: "https://unlimplay.com/f/embed/tv/1429/1/1" },
  { name: "Demon Slayer T2E3", url: "https://unlimplay.com/f/embed/tv/85937/2/3" },
  { name: "Interstellar", url: "https://unlimplay.com/f/embed/movie/157336" },
  { name: "The Office T1E1", url: "https://unlimplay.com/f/embed/tv/2316/1/1" },
];

const { scrapeServers } = await import("../lib/unlimplay.ts");

for (const test of tests) {
  console.log(`\n--- ${test.name} ---`);
  try {
    const servers = await scrapeServers(test.url);
    if (servers.length === 0) {
      console.log("  NO SERVERS FOUND");
    } else {
      console.log(`  ${servers.length} servers:`);
      const byLang = {};
      for (const s of servers) {
        const lang = s.lang || "unknown";
        if (!byLang[lang]) byLang[lang] = [];
        byLang[lang].push(s.name);
      }
      for (const [lang, names] of Object.entries(byLang)) {
        console.log(`    ${lang}: ${names.join(", ")}`);
      }
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
