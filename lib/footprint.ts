import type { FootprintResult, LatLng } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_M = 50;

export class FootprintError extends Error {
  readonly code: "BAD_INPUT" | "NETWORK" | "BAD_RESPONSE";
  constructor(code: FootprintError["code"], message: string) {
    super(message);
    this.name = "FootprintError";
    this.code = code;
  }
}

type OverpassNode = { lat: number; lon: number };
type OverpassWay = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassNode[];
};
type OverpassResponse = { elements: OverpassWay[] };

function buildQuery(lat: number, lng: number): string {
  return `
    [out:json][timeout:25];
    way(around:${SEARCH_RADIUS_M},${lat},${lng})["building"];
    out geom;
  `.trim();
}

export async function fetchFootprint(
  lat: number,
  lng: number
): Promise<FootprintResult | null> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new FootprintError("BAD_INPUT", "lat out of range");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new FootprintError("BAD_INPUT", "lng out of range");
  }

  let res: Response;
  try {
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: buildQuery(lat, lng),
    });
  } catch (err) {
    throw new FootprintError(
      "NETWORK",
      `overpass request failed: ${(err as Error).message}`
    );
  }

  if (!res.ok) {
    throw new FootprintError("NETWORK", `overpass returned ${res.status}`);
  }

  let data: OverpassResponse;
  try {
    data = (await res.json()) as OverpassResponse;
  } catch {
    throw new FootprintError("BAD_RESPONSE", "could not parse overpass json");
  }

  const ways = (data.elements ?? []).filter(
    (e): e is OverpassWay =>
      e.type === "way" && Array.isArray(e.geometry) && e.geometry.length >= 3
  );
  if (ways.length === 0) return null;

  // Pick the first way (closest enough; spec doesn't require ranking).
  const way = ways[0];
  const polygon: LatLng[] = way.geometry!.map((n) => ({
    lat: n.lat,
    lng: n.lon,
  }));

  const levelsTag = way.tags?.["building:levels"];
  const levels = parseLevels(levelsTag);

  return { polygon, levels };
}

function parseLevels(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.round(n);
}
