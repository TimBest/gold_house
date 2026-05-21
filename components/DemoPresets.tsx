"use client";

import { DEMO_PRESETS } from "@/lib/demoPresets";
import type { UrlState } from "@/lib/types";

export function DemoPresets({
  onPick,
}: {
  onPick: (state: UrlState) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-stone-500">
        Or try a sample
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPick(preset.state)}
            className="flex flex-col items-start rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-amber-700 hover:bg-amber-50"
          >
            <span className="text-sm font-medium text-stone-800">
              {preset.label}
            </span>
            <span className="text-xs text-stone-500">{preset.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
