import { NextResponse } from "next/server";
import { fetchAssessorData } from "@/lib/assessor";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "address, lat, and lng are required" },
      { status: 400 }
    );
  }

  const result = await fetchAssessorData({ address, lat, lng });
  return NextResponse.json({ result });
}
