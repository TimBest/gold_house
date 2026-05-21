import { describe, expect, test } from "bun:test";
import { DEMO_PRESETS } from "@/lib/demoPresets";
import { computeForState } from "@/lib/pipeline";
import { FALLBACK_PRICES } from "@/lib/commodities";

const NEVER_CALLED_FETCHERS = {
  geocode: async () => {
    throw new Error("demo presets must not hit the network");
  },
  footprint: async () => {
    throw new Error("demo presets must not hit the network");
  },
  assessor: async () => {
    throw new Error("demo presets must not hit the network");
  },
};

describe("DEMO_PRESETS", () => {
  test("has stable IDs (no duplicates)", () => {
    const ids = DEMO_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every preset resolves to a positive height without network", async () => {
    for (const preset of DEMO_PRESETS) {
      const r = await computeForState(
        preset.state,
        FALLBACK_PRICES,
        NEVER_CALLED_FETCHERS
      );
      expect(r.kind).toBe("ok");
      if (r.kind !== "ok") continue;
      expect(r.heightM).toBeGreaterThan(0);
      expect(Number.isFinite(r.heightM)).toBe(true);
    }
  });

  test("every preset has both sqft and value (manual-fallback ready)", () => {
    for (const preset of DEMO_PRESETS) {
      expect(preset.state.sqft).toBeGreaterThan(0);
      expect(preset.state.value).toBeGreaterThan(0);
    }
  });
});
