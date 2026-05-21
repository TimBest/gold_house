"use client";

import { COMMODITIES } from "@/lib/commodities";
import type { ComputeResult } from "@/lib/pipeline";

export function IsoViz({ result }: { result: Extract<ComputeResult, { kind: "ok" }> }) {
  const config = COMMODITIES[result.commodity];
  const height = result.heightM;

  // Bar height scales logarithmically so 1 m and 1000 m both look meaningful.
  const barPct = Math.min(100, Math.max(5, 20 + Math.log10(Math.max(1, height)) * 20));

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
      <div className="text-center">
        <div className="text-5xl font-bold tabular-nums">
          {formatMeters(height)}
        </div>
        <div className="mt-1 text-sm text-stone-500">
          tall block of {config.label.toLowerCase()}
        </div>
      </div>

      <div className="mt-8 flex items-end justify-center" aria-hidden>
        <div
          className="w-24 rounded-t-md"
          style={{
            backgroundColor: config.color,
            height: `${barPct}%`,
            minHeight: 60,
            maxHeight: 280,
          }}
        />
      </div>

      <div className="mt-6 text-center text-lg text-stone-700">
        {result.reference.label}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-stone-600">
        <dt>Home value</dt>
        <dd className="text-right tabular-nums">
          ${result.assessedValue.toLocaleString()}
        </dd>
        <dt>Footprint area</dt>
        <dd className="text-right tabular-nums">
          {result.footprintAreaM2.toFixed(1)} m²
        </dd>
        <dt>{config.label} price</dt>
        <dd className="text-right tabular-nums">
          ${Math.round(result.pricePerM3).toLocaleString()} / m³
        </dd>
        <dt>Footprint source</dt>
        <dd className="text-right">{result.source.footprint}</dd>
      </dl>
    </section>
  );
}

function formatMeters(m: number): string {
  if (m < 0.1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
