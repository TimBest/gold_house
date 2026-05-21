import { NextResponse } from "next/server";
import { fetchFootprint, FootprintError } from "@/lib/footprint";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  try {
    const result = await fetchFootprint(lat, lng);
    if (result === null) {
      return NextResponse.json({ result: null });
    }
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof FootprintError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "BAD_INPUT" ? 400 : 502 }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
