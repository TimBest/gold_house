import { describe, expect, test } from "bun:test";
import {
  COMMODITIES,
  FALLBACK_PRICES,
  pricePerM3,
} from "@/lib/commodities";

describe("COMMODITIES constants", () => {
  test("has gold, oil, sugar with required fields", () => {
    for (const id of ["gold", "oil", "sugar"] as const) {
      expect(COMMODITIES[id]).toBeDefined();
      expect(COMMODITIES[id].label).toBeTruthy();
      expect(COMMODITIES[id].emoji).toBeTruthy();
      expect(COMMODITIES[id].densityKgPerM3).toBeGreaterThan(0);
    }
  });
});

describe("pricePerM3", () => {
  test("gold: $2000/troy-oz → ~$1.24B/m3", () => {
    // (2000 / 0.0311035) * 19300 = 1,241,210,313
    const v = pricePerM3("gold", 2000);
    expect(v).toBeCloseTo((2000 / 0.0311035) * 19300, -2);
    expect(v).toBeGreaterThan(1.2e9);
    expect(v).toBeLessThan(1.3e9);
  });

  test("oil: $80/barrel → ~$503/m3", () => {
    // 80 / 0.158987 = 503.18
    const v = pricePerM3("oil", 80);
    expect(v).toBeCloseTo(80 / 0.158987, 4);
  });

  test("sugar: $0.20/lb → ~$701/m3", () => {
    // (0.20 / 0.453592) * 1590 = 701.07
    const v = pricePerM3("sugar", 0.2);
    expect(v).toBeCloseTo((0.2 / 0.453592) * 1590, 4);
  });

  test("zero raw price throws", () => {
    expect(() => pricePerM3("gold", 0)).toThrow();
  });

  test("negative raw price throws", () => {
    expect(() => pricePerM3("oil", -1)).toThrow();
  });
});

describe("FALLBACK_PRICES", () => {
  test("has snapshot for each commodity with fromFallback=true", () => {
    for (const id of ["gold", "oil", "sugar"] as const) {
      const snap = FALLBACK_PRICES[id];
      expect(snap.pricePerM3).toBeGreaterThan(0);
      expect(snap.fromFallback).toBe(true);
      expect(snap.asOf).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});
