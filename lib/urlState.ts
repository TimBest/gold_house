import type { CommodityId, UrlState } from "./types";

const VALID_COMMODITIES = new Set<CommodityId>(["gold", "oil", "sugar"]);

function asCommodity(raw: string | null): CommodityId {
  if (raw && VALID_COMMODITIES.has(raw as CommodityId)) {
    return raw as CommodityId;
  }
  return "gold";
}

function asPositiveNumber(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function parseSearchParams(sp: URLSearchParams): UrlState {
  const state: UrlState = {
    address: sp.get("address") ?? "",
    commodity: asCommodity(sp.get("commodity")),
  };
  const sqft = asPositiveNumber(sp.get("sqft"));
  if (sqft !== undefined) state.sqft = sqft;
  const value = asPositiveNumber(sp.get("value"));
  if (value !== undefined) state.value = value;
  return state;
}

export function toQueryString(state: UrlState): string {
  const sp = new URLSearchParams();
  sp.set("address", state.address);
  sp.set("commodity", state.commodity);
  if (state.sqft !== undefined) sp.set("sqft", String(state.sqft));
  if (state.value !== undefined) sp.set("value", String(state.value));
  return sp.toString();
}
