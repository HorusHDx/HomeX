import { NextRequest, NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!TMDB_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY no configurada" }, { status: 500 });
  }

  const path = params.path.join("/");
  const searchParams = new URL(request.url).searchParams;

  const url = new URL(`${TMDB_BASE}/${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "es-ES");
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error al consultar TMDB" }, { status: 502 });
  }
}
