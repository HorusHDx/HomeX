import { NextRequest, NextResponse } from "next/server";
import { getAnime2Info } from "@/lib/animeav1";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = (new URL(request.url).searchParams.get("slug") || "").trim();
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }
  try {
    const info = await getAnime2Info(slug);
    if (!info) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(
      info,
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=7200" } }
    );
  } catch {
    return NextResponse.json({ error: "Error en Anime2" }, { status: 502 });
  }
}
