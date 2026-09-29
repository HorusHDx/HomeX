import { NextRequest, NextResponse } from "next/server";
import { scrapeServers, getMovieEmbedUrl, getTvEmbedUrl } from "@/lib/unlimplay";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "movie" | "tv" | null;
  const id = searchParams.get("id");
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");

  if (!type || !id) {
    return NextResponse.json({ error: "Faltan parámetros: type, id" }, { status: 400 });
  }

  let embedUrl: string;
  if (type === "movie") {
    embedUrl = getMovieEmbedUrl(id);
  } else {
    if (!season || !episode) {
      return NextResponse.json(
        { error: "Para TV se requieren season y episode" },
        { status: 400 }
      );
    }
    embedUrl = getTvEmbedUrl(id, parseInt(season), parseInt(episode));
  }

  const servers = await scrapeServers(embedUrl);
  return NextResponse.json({ servers, embedUrl });
}
