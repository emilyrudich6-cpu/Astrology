import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(searchPlaces(q.slice(0, 80)));
}
