import { NextResponse } from "next/server";
import { geocodeAddress, GeocodeError } from "@/lib/geocode";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";
  try {
    const result = await geocodeAddress(address);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeocodeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "NETWORK" ? 502 : 404 }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
