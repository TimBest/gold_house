export type ReferenceObject = {
  id:
    | "credit-card"
    | "human"
    | "telephone-pole"
    | "statue-of-liberty"
    | "eiffel-tower"
    | "burj-khalifa";
  label: string;
  heightM: number;
  svgFile: string;
  maxMultiple: number;
  /** Single-glyph stand-in used by IsoViz until proper SVGs land. */
  glyph: string;
};

export const REFERENCE_OBJECTS: ReferenceObject[] = [
  {
    id: "credit-card",
    label: "Credit Card",
    heightM: 0.00085,
    svgFile: "credit-card.svg",
    maxMultiple: 5,
    glyph: "💳",
  },
  {
    id: "human",
    label: "Human",
    heightM: 1.7,
    svgFile: "human.svg",
    maxMultiple: 5,
    glyph: "🧍",
  },
  {
    id: "telephone-pole",
    label: "Telephone Pole",
    heightM: 12,
    svgFile: "telephone-pole.svg",
    maxMultiple: 5,
    glyph: "📏",
  },
  {
    id: "statue-of-liberty",
    label: "Statue of Liberty",
    heightM: 93,
    svgFile: "statue-of-liberty.svg",
    maxMultiple: 5,
    glyph: "🗽",
  },
  {
    id: "eiffel-tower",
    label: "Eiffel Tower",
    heightM: 330,
    svgFile: "eiffel-tower.svg",
    maxMultiple: 5,
    glyph: "🗼",
  },
  {
    id: "burj-khalifa",
    label: "Burj Khalifa",
    heightM: 828,
    svgFile: "burj-khalifa.svg",
    maxMultiple: 5,
    glyph: "🏙️",
  },
];

export type ReferencePick = {
  object: ReferenceObject;
  /** How many of the object stacked are at-or-just-below tower height. */
  count: number;
  /** Human-readable comparison label. */
  label: string;
  /**
   * True iff the tower exceeds maxMultiple of the largest reference object;
   * in that case `count` is the (possibly non-integer) multiple and the
   * caller should render the label as text instead of stacked SVGs.
   */
  overflow: boolean;
};

/**
 * Pick the most flattering reference object for a tower of `heightM` meters.
 *
 * Rules:
 * - Choose the largest object whose height fits at least once in the tower.
 * - count = floor(tower / object.height), capped at object.maxMultiple.
 * - If that largest-fitting object is the biggest in the list (Burj Khalifa)
 *   and tower > maxMultiple * object.height, mark `overflow: true` and use
 *   the precise multiple in the label as text.
 */
export function pickReference(heightM: number): ReferencePick {
  if (!(heightM > 0)) throw new Error("heightM must be > 0");

  const lastIdx = REFERENCE_OBJECTS.length - 1;

  for (let i = lastIdx; i >= 0; i--) {
    const obj = REFERENCE_OBJECTS[i];
    if (heightM < obj.heightM) continue;
    const exact = heightM / obj.heightM;
    const isLargest = i === lastIdx;
    const overflow = isLargest && exact > obj.maxMultiple;
    const count = overflow ? exact : Math.min(Math.floor(exact), obj.maxMultiple);
    const label = overflow
      ? `${exact.toFixed(1)} × ${obj.label}`
      : count === 1
        ? `= 1 ${obj.label}`
        : `= ${count} ${pluralize(obj.label)} stacked`;
    return { object: obj, count, label, overflow };
  }

  // Tower is shorter than even the smallest object — show as a fraction.
  const smallest = REFERENCE_OBJECTS[0];
  const exact = heightM / smallest.heightM;
  return {
    object: smallest,
    count: Math.max(1, Math.floor(exact)),
    label: `≈ ${exact.toFixed(1)} ${pluralize(smallest.label)}`,
    overflow: false,
  };
}

function pluralize(label: string): string {
  // Naive: works for our six fixed labels (Human → Humans, etc.).
  if (/(s|x|z|ch|sh)$/i.test(label)) return label + "es";
  return label + "s";
}
