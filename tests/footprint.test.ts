import { describe, expect, test } from "bun:test";
import { fetchFootprint, FootprintError } from "@/lib/footprint";
import {
  overpassBuilding,
  overpassBuildingNoLevels,
  overpassEmpty,
} from "./fixtures/overpass";
import { setMockFetch } from "./setup";

function mockFetchOnce(payload: unknown, status = 200) {
  setMockFetch(
    async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      })
  );
}

describe("fetchFootprint", () => {
  test("returns polygon and levels on hit", async () => {
    mockFetchOnce(overpassBuilding);
    const r = await fetchFootprint(41.5052, -73.9697);
    expect(r).not.toBeNull();
    expect(r!.polygon.length).toBeGreaterThanOrEqual(3);
    expect(r!.levels).toBe(2);
    expect(r!.polygon[0]).toEqual({ lat: 41.505, lng: -73.97 });
  });

  test("defaults levels to 1 when tag absent", async () => {
    mockFetchOnce(overpassBuildingNoLevels);
    const r = await fetchFootprint(41.5052, -73.9697);
    expect(r!.levels).toBe(1);
  });

  test("returns null when no buildings near point", async () => {
    mockFetchOnce(overpassEmpty);
    const r = await fetchFootprint(41.5052, -73.9697);
    expect(r).toBeNull();
  });

  test("throws on network failure", async () => {
    setMockFetch(async () => {
      throw new Error("connection refused");
    });
    await expect(fetchFootprint(0, 0)).rejects.toBeInstanceOf(FootprintError);
  });

  test("throws on 5xx response", async () => {
    mockFetchOnce({}, 503);
    await expect(fetchFootprint(0, 0)).rejects.toBeInstanceOf(FootprintError);
  });

  test("rejects invalid lat/lng without making a network call", async () => {
    let called = false;
    setMockFetch(async () => {
      called = true;
      return new Response("{}");
    });
    await expect(fetchFootprint(NaN, 0)).rejects.toBeInstanceOf(
      FootprintError
    );
    await expect(fetchFootprint(0, 200)).rejects.toBeInstanceOf(
      FootprintError
    );
    expect(called).toBe(false);
  });
});
