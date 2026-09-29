import { NextRequest, NextResponse } from "next/server";
import { searchTMDB } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Falta el parámetro q" }, { status: 400 });
  }

  try {
    const data = await searchTMDB(query);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error en la búsqueda" }, { status: 502 });
  }
}
