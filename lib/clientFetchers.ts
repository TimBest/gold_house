import { GeocodeError } from "./geocode";
import { FootprintError } from "./footprint";
import type {
  AssessorQuery,
  AssessorResult,
  CommodityPrices,
  FootprintResult,
  GeocodeResult,
} from "./types";
import type { Fetchers } from "./pipeline";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body = (await res.json()) as T | { error?: string; code?: string };
  if (!res.ok) {
    const err = body as { error?: string; code?: string };
    throw new Error(err.error ?? `request to ${path} failed`);
  }
  return body as T;
}

function buildUrl(path: string, params: Record<string, string | number>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
  return `${path}?${sp.toString()}`;
}

export const clientFetchers: Fetchers = {
  geocode: async (address) => {
    try {
      return await getJson<GeocodeResult>(
        buildUrl("/api/geocode", { address })
      );
    } catch (err) {
      throw new GeocodeError("NO_RESULT", (err as Error).message);
    }
  },
  footprint: async (lat, lng) => {
    try {
      const { result } = await getJson<{ result: FootprintResult | null }>(
        buildUrl("/api/footprint", { lat, lng })
      );
      return result;
    } catch (err) {
      throw new FootprintError("NETWORK", (err as Error).message);
    }
  },
  assessor: async ({ address, lat, lng }: AssessorQuery) => {
    const { result } = await getJson<{ result: AssessorResult | null }>(
      buildUrl("/api/assessor", { address, lat, lng })
    );
    return result;
  },
};

export async function fetchPrices(): Promise<CommodityPrices> {
  return getJson<CommodityPrices>("/api/commodities");
}
