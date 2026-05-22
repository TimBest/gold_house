import type { HeightComputationInput, Polygon } from "./types";

const SQFT_TO_SQM = 0.0929;
const METERS_PER_DEG_LAT = 111_320;

export function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function sqFtToSqM(sqft: number): number {
  if (sqft < 0) throw new Error("sqft must be non-negative");
  return sqft * SQFT_TO_SQM;
}

/**
 * Area of a lat/lng polygon in square meters via shoelace on a local
 * equirectangular projection. Accurate to <0.1% at building scale.
 */
export function polygonAreaM2(polygon: Polygon): number {
  if (polygon.length < 3) return 0;

  const lat0 = polygon[0].lat;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);

  // Project to local meters relative to polygon[0].
  const pts = polygon.map((p) => ({
    x: (p.lng - polygon[0].lng) * METERS_PER_DEG_LAT * cosLat,
    y: (p.lat - lat0) * METERS_PER_DEG_LAT,
  }));

  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function totalFloorAreaM2({
  footprintM2,
  levels = 1,
}: {
  footprintM2: number;
  levels?: number;
}): number {
  if (footprintM2 < 0) throw new Error("footprintM2 must be non-negative");
  if (levels < 1) throw new Error("levels must be >= 1");
  return footprintM2 * levels;
}

export function heightOfPrism({
  assessedValue,
  pricePerM3,
  footprintAreaM2,
}: HeightComputationInput): number {
  if (assessedValue < 0) throw new Error("assessedValue must be non-negative");
  if (pricePerM3 <= 0) throw new Error("pricePerM3 must be > 0");
  if (footprintAreaM2 <= 0) throw new Error("footprintAreaM2 must be > 0");
  return assessedValue / (pricePerM3 * footprintAreaM2);
}
