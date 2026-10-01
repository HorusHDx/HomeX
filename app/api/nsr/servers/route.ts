import { NextRequest, NextResponse } from "next/server";
import { getNsrServers, parseNsrTarget } from "@/lib/nsr";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = parseNsrTarget(searchParams);
  if (!target) {
    return NextResponse.json({ error: "Parámetros inválidos: type, id" }, { status: 400 });
  }

  const servers = await getNsrServers(target);
  return NextResponse.json({ servers }, { headers: { "Cache-Control": "no-store" } });
}
