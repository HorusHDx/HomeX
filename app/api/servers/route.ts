import { NextRequest, NextResponse } from "next/server";
import { getMovieEmbedUrl, getTvEmbedUrl } from "@/lib/unlimplay";
import { scrapeServersFromWorker } from "@/lib/unlimplayWorker";

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
  let season = 1;
  let episode = 1;
  if (type === "movie") {
    embedUrl = getMovieEmbedUrl(id);
  } else {
    season = parseInt(seasonRaw || "", 10);
    episode = parseInt(episodeRaw || "", 10);
    if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) {
      return NextResponse.json(
        { error: "Para TV se requieren season y episode válidos" },
        { status: 400 }
      );
    }
    embedUrl = getTvEmbedUrl(id, season, episode);
  }

  // Server1 sale solo por el Worker de Cloudflare: scrapea desde sus IPs,
  // cachea en el edge y responde en ~10ms cuando ya esta caliente.
  const servers = await scrapeServersFromWorker(type, id, season, episode);
  if (!servers) {
    return NextResponse.json(
      {
        error: "Server1 no disponible ahora mismo",
        servers: [{ name: "Servidor Principal", url: embedUrl, lang: "original" }],
        embedUrl,
        noSources: true,
      },
      { status: 502, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  const noSources = countRealServers(servers) === 0;
  return NextResponse.json(
    { servers, embedUrl, noSources },
    {
      headers: {
        "Cache-Control": noSources
          ? "public, s-maxage=120, stale-while-revalidate=600"
          : "public, s-maxage=900, stale-while-revalidate=86400",
        "x-server-source": "worker",
      },
    }
  );
}

// El Worker devuelve un único "Servidor Principal" (la URL del embed tal
// cual) cuando no logra extraer fuentes. No es un servidor real: sirve para
// distinguir "no hay nada" de "hay servidores".
function countRealServers(servers: { name: string }[]): number {
  return servers.filter((s) => s.name !== "Servidor Principal").length;
}
