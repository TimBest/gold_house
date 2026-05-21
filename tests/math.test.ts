import { describe, expect, test } from "bun:test";
import {
  heightOfPrism,
  polygonAreaM2,
  sqFtToSqM,
  totalFloorAreaM2,
} from "@/lib/math";

describe("sqFtToSqM", () => {
  test("converts square feet to square meters", () => {
    expect(sqFtToSqM(1000)).toBeCloseTo(92.9, 4);
  });

  test("zero maps to zero", () => {
    expect(sqFtToSqM(0)).toBe(0);
  });

  test("rejects negative values", () => {
    expect(() => sqFtToSqM(-1)).toThrow();
  });
});

describe("polygonAreaM2", () => {
  test("computes area of a ~10m square near the equator", () => {
    // 10m east-west at the equator is ~ 9.0e-5 degrees longitude
    // 10m north-south is ~ 9.0e-5 degrees latitude
    const d = 10 / 111_320; // degrees per 10m
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: d },
      { lat: d, lng: d },
      { lat: d, lng: 0 },
    ];
    const area = polygonAreaM2(square);
    expect(area).toBeGreaterThan(95);
    expect(area).toBeLessThan(105);
  });

  test("ignores winding direction", () => {
    const d = 10 / 111_320;
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: d },
      { lat: d, lng: d },
      { lat: d, lng: 0 },
    ];
    const reversed = [...square].reverse();
    expect(polygonAreaM2(reversed)).toBeCloseTo(polygonAreaM2(square), 4);
  });

  test("degenerate polygon (< 3 points) is zero", () => {
    expect(polygonAreaM2([])).toBe(0);
    expect(polygonAreaM2([{ lat: 0, lng: 0 }])).toBe(0);
    expect(
      polygonAreaM2([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ])
    ).toBe(0);
  });
});

describe("totalFloorAreaM2", () => {
  test("multiplies footprint by levels", () => {
    expect(totalFloorAreaM2({ footprintM2: 100, levels: 2 })).toBe(200);
  });

  test("levels defaults to 1 when missing", () => {
    expect(totalFloorAreaM2({ footprintM2: 100 })).toBe(100);
  });

  test("levels less than 1 throws", () => {
    expect(() =>
      totalFloorAreaM2({ footprintM2: 100, levels: 0 })
    ).toThrow();
  });
});

describe("heightOfPrism", () => {
  test("computes height = value / (pricePerM3 * area)", () => {
    // $1,000,000 home, $1000/m3 commodity, 100 m2 footprint → 10 m
    const h = heightOfPrism({
      assessedValue: 1_000_000,
      pricePerM3: 1000,
      footprintAreaM2: 100,
    });
    expect(h).toBe(10);
  });

  test("zero footprint throws", () => {
    expect(() =>
      heightOfPrism({
        assessedValue: 100,
        pricePerM3: 100,
        footprintAreaM2: 0,
      })
    ).toThrow();
  });

  test("zero price throws", () => {
    expect(() =>
      heightOfPrism({
        assessedValue: 100,
        pricePerM3: 0,
        footprintAreaM2: 100,
      })
    ).toThrow();
  });

  test("negative inputs throw", () => {
    expect(() =>
      heightOfPrism({
        assessedValue: -1,
        pricePerM3: 100,
        footprintAreaM2: 100,
      })
    ).toThrow();
  });
});
