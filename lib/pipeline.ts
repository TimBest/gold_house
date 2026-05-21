import type {
  AssessorQuery,
  AssessorResult,
  CommodityId,
  CommodityPrices,
  FootprintResult,
  GeocodeResult,
  Polygon,
  UrlState,
} from "./types";
import {
  heightOfPrism,
  polygonAreaM2,
  sqFtToSqM,
  totalFloorAreaM2,
} from "./math";
import { pickReference, type ReferencePick } from "./scaleReference";

export type Fetchers = {
  geocode: (address: string) => Promise<GeocodeResult>;
  footprint: (lat: number, lng: number) => Promise<FootprintResult | null>;
  assessor: (q: AssessorQuery) => Promise<AssessorResult | null>;
};

export type ComputeResult =
  | {
      kind: "ok";
      heightM: number;
      commodity: CommodityId;
      pricePerM3: number;
      assessedValue: number;
      footprintAreaM2: number;
      totalFloorAreaM2: number;
      polygon: Polygon | null;
      reference: ReferencePick;
      source: {
        value: "manual" | "assessor";
        footprint: "manual" | "osm" | "sqft-derived";
      };
    }
  | { kind: "needs-manual"; reason: string }
  | { kind: "error"; message: string };

/** Build a square polygon of the given area, centered at (0,0) in lat/lng. */
function squareFromArea(areaM2: number): Polygon {
  const side = Math.sqrt(areaM2);
  // 1 deg lat ≈ 111_320 m
  const half = side / 2 / 111_320;
  return [
    { lat: -half, lng: -half },
    { lat: -half, lng: half },
    { lat: half, lng: half },
    { lat: half, lng: -half },
  ];
}

export async function computeForState(
  state: UrlState,
  prices: CommodityPrices,
  fetchers: Fetchers
): Promise<ComputeResult> {
  const { commodity } = state;
  const pricePerM3 = prices[commodity].pricePerM3;

  // 1. Manual fallback short-circuit.
  if (state.sqft !== undefined && state.value !== undefined) {
    const footprintAreaM2 = sqFtToSqM(state.sqft);
    return finalize({
      assessedValue: state.value,
      pricePerM3,
      commodity,
      footprintAreaM2,
      totalFloor: footprintAreaM2,
      polygon: squareFromArea(footprintAreaM2),
      source: { value: "manual", footprint: "manual" },
    });
  }

  // 2. Geocode is mandatory.
  let geo: GeocodeResult;
  try {
    geo = await fetchers.geocode(state.address);
  } catch (err) {
    return { kind: "error", message: (err as Error).message };
  }

  // 3. Footprint + assessor in parallel.
  const [footprintRes, assessorRes] = await Promise.all([
    fetchers.footprint(geo.lat, geo.lng).catch(() => null),
    fetchers
      .assessor({ address: state.address, lat: geo.lat, lng: geo.lng })
      .catch(() => null),
  ]);

  // 4. Need a home value from somewhere.
  const value = assessorRes?.value;
  if (value === undefined || value === null) {
    return {
      kind: "needs-manual",
      reason: "no assessor data — enter sqft + value manually",
    };
  }

  // 5. Determine footprint.
  let polygon: Polygon | null;
  let footprintAreaM2: number;
  let totalFloor: number;
  let footprintSource: "osm" | "sqft-derived";

  if (footprintRes) {
    polygon = footprintRes.polygon;
    footprintAreaM2 = polygonAreaM2(polygon);
    totalFloor = totalFloorAreaM2({
      footprintM2: footprintAreaM2,
      levels: footprintRes.levels,
    });
    footprintSource = "osm";
  } else if (assessorRes?.sqft) {
    const totalFloorM2 = sqFtToSqM(assessorRes.sqft);
    footprintAreaM2 = totalFloorM2;
    totalFloor = totalFloorM2;
    polygon = squareFromArea(totalFloorM2);
    footprintSource = "sqft-derived";
  } else {
    return {
      kind: "needs-manual",
      reason: "no footprint — enter sqft + value manually",
    };
  }

  if (footprintAreaM2 <= 0) {
    return {
      kind: "needs-manual",
      reason: "footprint area is zero",
    };
  }

  return finalize({
    assessedValue: value,
    pricePerM3,
    commodity,
    footprintAreaM2,
    totalFloor,
    polygon,
    source: { value: "assessor", footprint: footprintSource },
  });
}

function finalize(args: {
  assessedValue: number;
  pricePerM3: number;
  commodity: CommodityId;
  footprintAreaM2: number;
  totalFloor: number;
  polygon: Polygon;
  source: { value: "manual" | "assessor"; footprint: "manual" | "osm" | "sqft-derived" };
}): ComputeResult {
  const heightM = heightOfPrism({
    assessedValue: args.assessedValue,
    pricePerM3: args.pricePerM3,
    footprintAreaM2: args.footprintAreaM2,
  });
  return {
    kind: "ok",
    heightM,
    commodity: args.commodity,
    pricePerM3: args.pricePerM3,
    assessedValue: args.assessedValue,
    footprintAreaM2: args.footprintAreaM2,
    totalFloorAreaM2: args.totalFloor,
    polygon: args.polygon,
    reference: pickReference(heightM),
    source: args.source,
  };
}

