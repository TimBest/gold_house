import { describe, expect, test } from "bun:test";
import { computeForState } from "@/lib/pipeline";
import { FALLBACK_PRICES } from "@/lib/commodities";
import type { Fetchers } from "@/lib/pipeline";

const PRICES = FALLBACK_PRICES;

function fetchersFromObject(overrides: Partial<Fetchers> = {}): Fetchers {
  return {
    geocode: async () => ({
      lat: 41.5051,
      lng: -73.9696,
      displayName: "123 Main St, Beacon, NY",
      countryCode: "us",
    }),
    footprint: async () => ({
      // Roughly a 10x10m square at the geocoded point
      polygon: [
        { lat: 41.5050, lng: -73.97 },
        { lat: 41.5050, lng: -73.9698 },
        { lat: 41.5052, lng: -73.9698 },
        { lat: 41.5052, lng: -73.97 },
      ],
      levels: 1,
    }),
    assessor: async () => ({ value: 1_000_000, sqft: 1500 }),
    ...overrides,
  };
}

describe("computeForState — happy path", () => {
  test("address-only state produces a positive heightM and reference", async () => {
    const result = await computeForState(
      {
        address: "123 Main St, Beacon, NY",
        commodity: "gold",
      },
      PRICES,
      fetchersFromObject()
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.heightM).toBeGreaterThan(0);
    expect(result.heightM).toBeLessThan(10_000);
    expect(result.reference.label).toBeTruthy();
    expect(result.commodity).toBe("gold");
    expect(result.source.value).toBe("assessor");
    expect(result.source.footprint).toBe("osm");
  });
});

describe("computeForState — manual fallback", () => {
  test("explicit sqft+value short-circuits the network calls", async () => {
    let networkCalled = false;
    const result = await computeForState(
      {
        address: "doesn't matter",
        commodity: "oil",
        sqft: 2000,
        value: 500_000,
      },
      PRICES,
      fetchersFromObject({
        geocode: async () => {
          networkCalled = true;
          throw new Error("should not be called");
        },
        footprint: async () => {
          networkCalled = true;
          throw new Error("should not be called");
        },
        assessor: async () => {
          networkCalled = true;
          throw new Error("should not be called");
        },
      })
    );
    expect(networkCalled).toBe(false);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.source.value).toBe("manual");
    expect(result.source.footprint).toBe("manual");
  });
});

describe("computeForState — fallbacks within the chain", () => {
  test("no OSM footprint but assessor has sqft → derive square footprint", async () => {
    const result = await computeForState(
      { address: "rural lot", commodity: "gold" },
      PRICES,
      fetchersFromObject({
        footprint: async () => null,
        assessor: async () => ({ value: 400_000, sqft: 1600 }),
      })
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.source.footprint).toBe("sqft-derived");
  });

  test("no footprint AND no assessor sqft AND no assessor value → needs-manual", async () => {
    const result = await computeForState(
      { address: "unknown", commodity: "gold" },
      PRICES,
      fetchersFromObject({
        footprint: async () => null,
        assessor: async () => null,
      })
    );
    expect(result.kind).toBe("needs-manual");
  });

  test("footprint exists but no value → needs-manual", async () => {
    const result = await computeForState(
      { address: "x", commodity: "gold" },
      PRICES,
      fetchersFromObject({
        assessor: async () => null,
      })
    );
    expect(result.kind).toBe("needs-manual");
  });
});

describe("computeForState — error path", () => {
  test("geocode failure surfaces as error", async () => {
    const result = await computeForState(
      { address: "bogus", commodity: "gold" },
      PRICES,
      fetchersFromObject({
        geocode: async () => {
          throw new Error("not found");
        },
      })
    );
    expect(result.kind).toBe("error");
  });

  test("commodity switch changes height across all four commodities", async () => {
    // Gold is dense per dollar → SHORTEST tower. Soybeans/oil are cheapest
    // per m^3 → TALLEST towers. Assert each produces a distinct finite
    // positive number.
    const base = {
      address: "x",
      sqft: 2000,
      value: 500_000,
    } as const;
    const fetchers = fetchersFromObject();
    const [g, o, s, sb] = await Promise.all([
      computeForState({ ...base, commodity: "gold" }, PRICES, fetchers),
      computeForState({ ...base, commodity: "oil" }, PRICES, fetchers),
      computeForState({ ...base, commodity: "sugar" }, PRICES, fetchers),
      computeForState({ ...base, commodity: "soybeans" }, PRICES, fetchers),
    ]);
    if (g.kind !== "ok" || o.kind !== "ok" || s.kind !== "ok" || sb.kind !== "ok") {
      throw new Error("expected all ok");
    }
    const heights = new Set([g.heightM, o.heightM, s.heightM, sb.heightM]);
    expect(heights.size).toBe(4);
    expect(o.heightM).toBeGreaterThan(g.heightM);
    expect(sb.heightM).toBeGreaterThan(g.heightM);
  });
});
