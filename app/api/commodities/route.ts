import { NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/livePrices";

export async function GET() {
  const prices = await fetchLivePrices();
  return NextResponse.json(prices, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
