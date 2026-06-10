"use client";

import { COMMODITIES } from "@/lib/commodities";
import type { CommodityId } from "@/lib/types";

const IDS: CommodityId[] = ["gold", "oil", "sugar", "soybeans"];

export function CommodityPicker({
  selected,
  onSelect,
}: {
  selected: CommodityId;
  onSelect: (id: CommodityId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {IDS.map((id) => {
        const c = COMMODITIES[id];
        const isSelected = id === selected;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={
              "flex flex-col items-center gap-1 rounded-xl border px-4 py-4 transition " +
              (isSelected
                ? "border-amber-700 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white hover:border-stone-300")
            }
            aria-pressed={isSelected}
          >
            <span className="text-3xl" aria-hidden>
              {c.emoji}
            </span>
            <span className="text-sm font-medium">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
