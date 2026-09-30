import { NextRequest, NextResponse } from "next/server";
import { getAnime2Servers } from "@/lib/animeav1";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();
  const episode = parseInt(searchParams.get("episode") || "", 10);

  if (!/^[a-z0-9-]{2,120}$/.test(slug) || !Number.isInteger(episode) || episode < 1) {
    return NextResponse.json({ error: "Parámetros inválidos: slug, episode" }, { status: 400 });
  }

  try {
    const servers = await getAnime2Servers(slug, episode);
    return NextResponse.json(
      { servers },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ servers: [] });
  }
}
