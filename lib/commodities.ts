import type {
  CommodityId,
  CommodityPriceSnapshot,
  CommodityPrices,
} from "./types";

type CommodityConfig = {
  emoji: string;
  label: string;
  densityKgPerM3: number;
  /** Color used for the placeholder bar in IsoViz. */
  color: string;
  /** Human-readable description of the raw price unit. */
  rawPriceUnit: string;
};

export const COMMODITIES: Record<CommodityId, CommodityConfig> = {
  gold: {
    emoji: "🥇",
    label: "Gold",
    densityKgPerM3: 19300,
    color: "#FFD700",
    rawPriceUnit: "USD/troy oz",
  },
  oil: {
    emoji: "🛢️",
    label: "Oil",
    densityKgPerM3: 870,
    color: "#1a1a1a",
    rawPriceUnit: "USD/barrel",
  },
  sugar: {
    emoji: "🍬",
    label: "Sugar",
    densityKgPerM3: 1590,
    color: "#FFFACD",
    rawPriceUnit: "USD/lb",
  },
};

const TROY_OZ_KG = 0.0311035;
const BARREL_M3 = 0.158987;
const LB_KG = 0.453592;

/**
 * Convert a commodity's raw market price into USD per m^3 of solid material.
 *   gold: rawPrice is USD per troy oz       → / TROY_OZ_KG → kg basis → * density
 *   oil:  rawPrice is USD per barrel        → / BARREL_M3  → m3 basis directly
 *   sugar: rawPrice is USD per pound        → / LB_KG      → kg basis → * density
 */
export function pricePerM3(
  commodity: CommodityId,
  rawPrice: number
): number {
  if (rawPrice <= 0) throw new Error("rawPrice must be > 0");
  const { densityKgPerM3 } = COMMODITIES[commodity];
  switch (commodity) {
    case "gold":
      return (rawPrice / TROY_OZ_KG) * densityKgPerM3;
    case "oil":
      return rawPrice / BARREL_M3;
    case "sugar":
      return (rawPrice / LB_KG) * densityKgPerM3;
  }
}

const FALLBACK_AS_OF = "2025-01-15";

function snap(pricePerM3Value: number): CommodityPriceSnapshot {
  return {
    pricePerM3: pricePerM3Value,
    fromFallback: true,
    asOf: FALLBACK_AS_OF,
  };
}

// Last-known-good rough numbers (as of FALLBACK_AS_OF). Used when the
// live commodities API call fails. Values are conservative spot averages.
export const FALLBACK_PRICES: CommodityPrices = {
  gold: snap(pricePerM3("gold", 2700)),
  oil: snap(pricePerM3("oil", 78)),
  sugar: snap(pricePerM3("sugar", 0.2)),
};
