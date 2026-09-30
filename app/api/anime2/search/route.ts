import { NextRequest, NextResponse } from "next/server";
import { searchAnime2, getAnime2Catalog } from "@/lib/animeav1";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  try {
    const results = q ? await searchAnime2(q) : await getAnime2Catalog(page);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
    );
  } catch {
    return NextResponse.json({ error: "Error en Anime2" }, { status: 502 });
  }
}
