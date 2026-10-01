import { NextRequest, NextResponse } from "next/server";
import { parseNsrTarget, resolveNsrStream, isNsrConfigured } from "@/lib/nsr";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = parseNsrTarget(searchParams);
  if (!target) {
    return NextResponse.json({ error: "Parámetros inválidos: type, id" }, { status: 400 });
  }

  if (!isNsrConfigured()) {
    return NextResponse.json(
      { error: "Server2 sin configurar: falta NSR_API_KEY en el servidor", noKey: true },
      { status: 503 }
    );
  }

  const index = parseInt(searchParams.get("index") || "", 10);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Parámetro index inválido" }, { status: 400 });
  }

  // El token vive 5 min y es de un solo uso: se canjea en cada cambio de
  // servidor, no antes. Nunca devolvemos directUrl (viene atado a la IP de NSR).
  const stream = await resolveNsrStream(target, index);
  if (!stream) {
    return NextResponse.json(
      { error: "No se pudo obtener el stream de ese servidor" },
      { status: 404 }
    );
  }

  return NextResponse.json(stream, { headers: { "Cache-Control": "no-store" } });
}
