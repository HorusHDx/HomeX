import { NextRequest, NextResponse } from "next/server";
import { isNsrConfigured, parseNsrTarget, resolveNsrRef } from "@/lib/nsr";

export const dynamic = "force-dynamic";
// Puede encadenar dos llamadas lentas a NSR (listar fuentes + canjear token).
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isNsrConfigured()) {
    return NextResponse.json(
      { error: "Server2 sin configurar: falta NSR_API_KEY en el servidor", noKey: true },
      { status: 503 }
    );
  }

  const ref = searchParams.get("ref") || "";
  if (!ref) {
    // Sin ref no podemos resolver: el target ya se usó al listar servidores.
    return NextResponse.json({ error: "Falta el parámetro ref" }, { status: 400 });
  }

  // El token viene firmado: nunca devolvemos directUrl (viene atado a la IP
  // de NSR y respondería 403 desde el navegador).
  const res = await resolveNsrRef(ref);
  if (!res.ok) {
    return NextResponse.json(
      { error: `No se pudo obtener el stream: ${res.reason}`, reason: res.reason },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { url: res.stream.url, format: res.stream.format, index: res.index, name: res.name, lang: res.lang },
    { headers: { "Cache-Control": "no-store" } }
  );
}
