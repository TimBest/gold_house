import { describe, expect, test } from "bun:test";
import {
  REFERENCE_OBJECTS,
  pickReference,
} from "@/lib/scaleReference";

describe("REFERENCE_OBJECTS", () => {
  test("is sorted ascending by heightM", () => {
    for (let i = 1; i < REFERENCE_OBJECTS.length; i++) {
      expect(REFERENCE_OBJECTS[i].heightM).toBeGreaterThan(
        REFERENCE_OBJECTS[i - 1].heightM
      );
    }
  });

  test("contains all six expected reference objects", () => {
    expect(REFERENCE_OBJECTS.map((r) => r.id)).toEqual([
      "credit-card",
      "human",
      "telephone-pole",
      "statue-of-liberty",
      "eiffel-tower",
      "burj-khalifa",
    ]);
  });

  test("every object has a glyph", () => {
    for (const r of REFERENCE_OBJECTS) {
      expect(r.glyph).toBeTruthy();
    }
  });
});

describe("pickReference", () => {
  test("very tiny tower → credit card, count 1", () => {
    const r = pickReference(0.001);
    expect(r.object.id).toBe("credit-card");
    expect(r.count).toBeGreaterThanOrEqual(1);
  });

  test("1.7m → 1 human", () => {
    const r = pickReference(1.7);
    expect(r.object.id).toBe("human");
    expect(r.count).toBe(1);
  });

  test("8.5m → 5 humans", () => {
    const r = pickReference(8.5);
    expect(r.object.id).toBe("human");
    expect(r.count).toBe(5);
  });

  test("12m → telephone-pole (not 6 humans)", () => {
    // 12 / 1.7 = 7.05, exceeds maxMultiple of 5 → step up.
    const r = pickReference(12);
    expect(r.object.id).toBe("telephone-pole");
    expect(r.count).toBe(1);
  });

  test("47.3m → 3 telephone poles", () => {
    const r = pickReference(47.3);
    expect(r.object.id).toBe("telephone-pole");
    expect(r.count).toBe(Math.floor(47.3 / 12));
  });

  test("100m → statue-of-liberty", () => {
    const r = pickReference(100);
    expect(r.object.id).toBe("statue-of-liberty");
    expect(r.count).toBe(1);
  });

  test("500m → eiffel-tower", () => {
    const r = pickReference(500);
    expect(r.object.id).toBe("eiffel-tower");
    expect(r.count).toBe(1);
  });

  test("4500m → text label for >5x Burj Khalifa", () => {
    const r = pickReference(4500);
    expect(r.object.id).toBe("burj-khalifa");
    // 4500 / 828 ≈ 5.43, exceeds maxMultiple
    expect(r.label.toLowerCase()).toContain("burj khalifa");
    expect(r.label).toMatch(/\d/);
    expect(r.overflow).toBe(true);
  });

  test("label includes count and object label for normal case", () => {
    const r = pickReference(3.4); // 2 humans
    expect(r.label.toLowerCase()).toContain("human");
    expect(r.label).toMatch(/2/);
  });

  test("rejects non-positive height", () => {
    expect(() => pickReference(0)).toThrow();
    expect(() => pickReference(-1)).toThrow();
  });
});
