import { NextRequest, NextResponse } from "next/server";
import { scrapeServers, getMovieEmbedUrl, getTvEmbedUrl } from "@/lib/unlimplay";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "movie" | "tv" | null;
  const id = searchParams.get("id");
  const seasonRaw = searchParams.get("season");
  const episodeRaw = searchParams.get("episode");

  if (!type || !id || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ error: "Parámetros inválidos: type, id" }, { status: 400 });
  }
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let embedUrl: string;
  if (type === "movie") {
    embedUrl = getMovieEmbedUrl(id);
  } else {
    const season = parseInt(seasonRaw || "", 10);
    const episode = parseInt(episodeRaw || "", 10);
    if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) {
      return NextResponse.json(
        { error: "Para TV se requieren season y episode válidos" },
        { status: 400 }
      );
    }
    embedUrl = getTvEmbedUrl(id, season, episode);
  }

  try {
    const servers = await scrapeServers(embedUrl);
    const noSources = countRealServers(servers) === 0;
    return NextResponse.json(
      { servers, embedUrl, noSources },
      {
        headers: {
          // Unlimplay tarda 4-6s en scrapear un título. Con SWR el CDN
          // sirve una copia vieja al instante y la refresca por detrás, así
          // que ni el primer visitante espera. Los "sin fuentes" se cachean
          // poco: suelen ser un fallo temporal de su scraper.
          "Cache-Control": noSources
            ? "public, s-maxage=120, stale-while-revalidate=600"
            : "public, s-maxage=900, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        servers: [{ name: "Servidor Principal", url: embedUrl, lang: "original" }],
        embedUrl,
        noSources: true,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }
}

// El scraper devuelve un único "Servidor Principal" (la URL del embed tal
// cual) cuando no logra extraer fuentes. No es un servidor real: sirve para
// distinguir "no hay nada" de "hay servidores".
function countRealServers(servers: { name: string }[]): number {
  return servers.filter((s) => s.name !== "Servidor Principal").length;
}
