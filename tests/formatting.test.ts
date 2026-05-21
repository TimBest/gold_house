import { describe, expect, test } from "bun:test";
import { formatBigUSD, formatMeters } from "@/lib/formatting";

describe("formatMeters", () => {
  test("uses cm under 0.1 m", () => {
    expect(formatMeters(0.05)).toBe("5.0 cm");
  });

  test("uses m between 0.1 and 1000", () => {
    expect(formatMeters(47.3)).toBe("47.3 m");
    expect(formatMeters(0.5)).toBe("0.5 m");
  });

  test("uses km at or above 1000 m", () => {
    expect(formatMeters(1234)).toBe("1.23 km");
  });
});

describe("formatBigUSD", () => {
  test("formats billions", () => {
    expect(formatBigUSD(1_500_000_000)).toBe("1.50B");
  });
  test("formats millions", () => {
    expect(formatBigUSD(2_300_000)).toBe("2.30M");
  });
  test("formats thousands", () => {
    expect(formatBigUSD(4_500)).toBe("4.5K");
  });
  test("formats small numbers as integers", () => {
    expect(formatBigUSD(42)).toBe("42");
  });
});
