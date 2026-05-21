import { FALLBACK_PRICES } from "./commodities";
import type { CommodityPrices } from "./types";

/**
 * Fetch live commodity prices from server-side sources. Each source is
 * wrapped in try/catch so a single outage falls back to the last-known-good
 * value from FALLBACK_PRICES (with fromFallback=true).
 *
 * For the MVP — until API keys are wired — this returns FALLBACK_PRICES
 * directly. The shape stays correct so the UI can show the "using cached
 * price as of [date]" label.
 */
export async function fetchLivePrices(): Promise<CommodityPrices> {
  // TODO: implement metals-api (gold), EIA (oil), and a sugar feed call here.
  return FALLBACK_PRICES;
}
