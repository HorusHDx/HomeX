import { NextRequest, NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!TMDB_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY no configurada" }, { status: 500 });
  }

  const path = params.path.join("/");
  // Whitelist básica para evitar SSRF
  if (!/^(movie|tv|search|trending|genre)\//.test(path) && !/^(movie|tv)$/.test(path.split("/")[0])) {
    return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;

  const url = new URL(`${TMDB_BASE}/${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "es-ES");
  for (const [key, value] of searchParams.entries()) {
    if (key === "api_key") continue;
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Error al consultar TMDB" }, { status: 502 });
  }
}
