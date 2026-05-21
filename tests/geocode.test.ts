import { describe, expect, test } from "bun:test";
import { geocodeAddress, GeocodeError } from "@/lib/geocode";
import {
  nominatimEmpty,
  nominatimNonUS,
  nominatimUS,
} from "./fixtures/nominatim";
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

function mockFetchError() {
  setMockFetch(async () => {
    throw new Error("network down");
  });
}

describe("geocodeAddress", () => {
  test("returns lat/lng/displayName/countryCode on US hit", async () => {
    mockFetchOnce(nominatimUS);
    const r = await geocodeAddress("123 Main St, Beacon, NY");
    expect(r.lat).toBeCloseTo(41.5051, 4);
    expect(r.lng).toBeCloseTo(-73.9696, 4);
    expect(r.countryCode).toBe("us");
    expect(r.displayName).toContain("Beacon");
  });

  test("rejects non-US addresses", async () => {
    mockFetchOnce(nominatimNonUS);
    await expect(geocodeAddress("Paris, France")).rejects.toBeInstanceOf(
      GeocodeError
    );
  });

  test("rejects when no results", async () => {
    mockFetchOnce(nominatimEmpty);
    await expect(geocodeAddress("zzzznotanaddress")).rejects.toBeInstanceOf(
      GeocodeError
    );
  });

  test("rejects on network error", async () => {
    mockFetchError();
    await expect(geocodeAddress("anywhere")).rejects.toBeInstanceOf(
      GeocodeError
    );
  });

  test("rejects empty input without making a network call", async () => {
    let called = false;
    setMockFetch(async () => {
      called = true;
      return new Response("[]");
    });
    await expect(geocodeAddress("")).rejects.toBeInstanceOf(GeocodeError);
    expect(called).toBe(false);
  });

  test("sends User-Agent and Accept headers required by Nominatim", async () => {
    let capturedHeaders: Headers | undefined;
    setMockFetch(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify(nominatimUS));
    });
    await geocodeAddress("123 Main St");
    expect(capturedHeaders?.get("user-agent")).toBeTruthy();
    expect(capturedHeaders?.get("accept")).toContain("application/json");
  });
});
