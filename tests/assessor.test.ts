import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  fetchAssessorData,
  __setProviders,
  __resetProviders,
} from "@/lib/assessor";

const QUERY = {
  address: "123 Main St, Beacon, NY",
  lat: 41.5051,
  lng: -73.9696,
};

beforeEach(() => {
  __resetProviders();
});

afterEach(() => {
  __resetProviders();
});

describe("fetchAssessorData fallback chain", () => {
  test("returns county API result when available", async () => {
    __setProviders({
      county: async () => ({ value: 500_000, sqft: 1800 }),
      attom: async () => {
        throw new Error("should not be called");
      },
    });
    const r = await fetchAssessorData(QUERY);
    expect(r).toEqual({ value: 500_000, sqft: 1800 });
  });

  test("falls through to ATTOM when county returns null", async () => {
    __setProviders({
      county: async () => null,
      attom: async () => ({ value: 420_000, sqft: null }),
    });
    const r = await fetchAssessorData(QUERY);
    expect(r).toEqual({ value: 420_000, sqft: null });
  });

  test("returns null when both providers return null", async () => {
    __setProviders({
      county: async () => null,
      attom: async () => null,
    });
    expect(await fetchAssessorData(QUERY)).toBeNull();
  });

  test("logs but swallows county errors and falls through to ATTOM", async () => {
    __setProviders({
      county: async () => {
        throw new Error("county API down");
      },
      attom: async () => ({ value: 100_000, sqft: 1000 }),
    });
    expect(await fetchAssessorData(QUERY)).toEqual({
      value: 100_000,
      sqft: 1000,
    });
  });

  test("returns null when both providers throw", async () => {
    __setProviders({
      county: async () => {
        throw new Error("nope");
      },
      attom: async () => {
        throw new Error("also nope");
      },
    });
    expect(await fetchAssessorData(QUERY)).toBeNull();
  });

  test("default providers return null (no keys configured yet)", async () => {
    // Without __setProviders, the real (stubbed) providers run.
    expect(await fetchAssessorData(QUERY)).toBeNull();
  });
});
