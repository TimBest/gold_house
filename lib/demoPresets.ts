import type { UrlState } from "./types";

export type DemoPreset = {
  id: string;
  /** Short label for the button. */
  label: string;
  /** Sub-label (e.g., neighborhood / market). */
  hint: string;
  /** URL state that resolves directly via the manual-fallback path. */
  state: UrlState;
};

/**
 * Curated example homes. Each preset carries an explicit sqft + value so the
 * pipeline can render immediately without depending on Nominatim/OSM/ATTOM.
 *
 * Numbers are illustrative round figures, not real assessments.
 */
export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "detroit-cottage",
    label: "Detroit cottage",
    hint: "$65k · 950 sqft",
    state: {
      address: "Detroit, MI (sample)",
      commodity: "gold",
      sqft: 950,
      value: 65_000,
    },
  },
  {
    id: "austin-ranch",
    label: "Austin ranch",
    hint: "$550k · 1,800 sqft",
    state: {
      address: "Austin, TX (sample)",
      commodity: "gold",
      sqft: 1_800,
      value: 550_000,
    },
  },
  {
    id: "brooklyn-brownstone",
    label: "Brooklyn brownstone",
    hint: "$2.1M · 2,400 sqft",
    state: {
      address: "Brooklyn, NY (sample)",
      commodity: "gold",
      sqft: 2_400,
      value: 2_100_000,
    },
  },
  {
    id: "beverly-hills-mansion",
    label: "Beverly Hills mansion",
    hint: "$18M · 9,500 sqft",
    state: {
      address: "Beverly Hills, CA (sample)",
      commodity: "gold",
      sqft: 9_500,
      value: 18_000_000,
    },
  },
];
