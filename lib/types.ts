export type CommodityId = "gold" | "oil" | "sugar";

export type LatLng = { lat: number; lng: number };

export type Polygon = LatLng[];

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  countryCode: string;
};

export type FootprintResult = {
  polygon: Polygon;
  levels: number;
};

export type AssessorResult = {
  value: number;
  sqft: number | null;
};

export type CommodityPriceSnapshot = {
  /** USD per cubic meter for a solid block of the commodity. */
  pricePerM3: number;
  /** Was this from a live fetch, or the hardcoded fallback. */
  fromFallback: boolean;
  /** When the underlying price was sampled (ISO 8601). */
  asOf: string;
};

export type CommodityPrices = Record<CommodityId, CommodityPriceSnapshot>;

export type UrlState = {
  address: string;
  commodity: CommodityId;
  sqft?: number;
  value?: number;
};

export type HeightComputationInput = {
  assessedValue: number;
  pricePerM3: number;
  footprintAreaM2: number;
};
