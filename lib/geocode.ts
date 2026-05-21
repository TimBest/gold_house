import type { GeocodeResult } from "./types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "gold-house/0.1 (https://github.com/timbest/gold_house)";

export class GeocodeError extends Error {
  readonly code:
    | "EMPTY_INPUT"
    | "NETWORK"
    | "NO_RESULT"
    | "NON_US"
    | "BAD_RESPONSE";
  constructor(code: GeocodeError["code"], message: string) {
    super(message);
    this.name = "GeocodeError";
    this.code = code;
  }
}

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  address?: { country_code?: string };
};

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    throw new GeocodeError("EMPTY_INPUT", "address must not be empty");
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new GeocodeError(
      "NETWORK",
      `nominatim request failed: ${(err as Error).message}`
    );
  }

  if (!res.ok) {
    throw new GeocodeError("NETWORK", `nominatim returned ${res.status}`);
  }

  let hits: NominatimHit[];
  try {
    hits = (await res.json()) as NominatimHit[];
  } catch {
    throw new GeocodeError("BAD_RESPONSE", "could not parse nominatim json");
  }

  if (!Array.isArray(hits) || hits.length === 0) {
    throw new GeocodeError(
      "NO_RESULT",
      "we couldn't find that address. Try including city and state."
    );
  }

  const hit = hits[0];
  const countryCode = (hit.address?.country_code ?? "").toLowerCase();
  if (countryCode !== "us") {
    throw new GeocodeError("NON_US", "US addresses only for now.");
  }

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new GeocodeError("BAD_RESPONSE", "lat/lng missing in response");
  }

  return {
    lat,
    lng,
    displayName: hit.display_name,
    countryCode,
  };
}
