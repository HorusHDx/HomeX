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
    return NextResponse.json(
      { servers, embedUrl },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ servers: [{ name: "Servidor Principal", url: embedUrl, lang: "original" }], embedUrl });
  }
}
