"use client";

import { COMMODITIES } from "@/lib/commodities";
import type { ComputeResult } from "@/lib/pipeline";

const VIZ_HEIGHT_PX = 360;
const COLUMN_WIDTH_PX = 88;
const REFERENCE_COL_WIDTH_PX = 64;

export function IsoViz({
  result,
}: {
  result: Extract<ComputeResult, { kind: "ok" }>;
}) {
  const config = COMMODITIES[result.commodity];
  const heightM = result.heightM;
  const ref = result.reference;

  // Pixels-per-meter is chosen so the *column* fills VIZ_HEIGHT_PX. The
  // reference glyph(s) are sized in the same scale, so the side-by-side
  // comparison is proportionally honest.
  const pxPerMeter = VIZ_HEIGHT_PX / heightM;
  const refGlyphPx = Math.max(
    14,
    Math.min(140, ref.object.heightM * pxPerMeter)
  );
  const columnPx = VIZ_HEIGHT_PX;

  const stackedCount = ref.overflow ? Math.floor(ref.count) : ref.count;
  // Tilt the column with a tiny shadow on the right face for depth.
  const lightColor = config.color;
  const darkColor = darken(lightColor, 0.18);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
      <div className="flex flex-col items-center gap-1">
        <div className="text-5xl font-bold tabular-nums tracking-tight">
          {formatMeters(heightM)}
        </div>
        <div className="text-sm text-stone-500">
          solid block of {config.label.toLowerCase()}
        </div>
      </div>

      <div
        className="mt-8 flex items-end justify-center gap-6"
        style={{ height: VIZ_HEIGHT_PX + 40 }}
        aria-label={`Visualization: ${formatMeters(heightM)} tower next to ${ref.label}`}
      >
        {/* Commodity column */}
        <div className="flex flex-col items-center">
          <div
            className="flex overflow-hidden rounded-t-md shadow-sm"
            style={{
              width: COLUMN_WIDTH_PX,
              height: columnPx,
            }}
          >
            <div
              style={{
                background: lightColor,
                width: "70%",
                borderRight: `1px solid ${darkColor}`,
              }}
            />
            <div
              style={{
                background: darkColor,
                width: "30%",
              }}
            />
          </div>
          <div className="mt-2 text-xs font-medium text-stone-500">
            {config.emoji} {config.label}
          </div>
        </div>

        {/* Reference stack */}
        <div
          className="flex flex-col items-center justify-end"
          style={{ width: REFERENCE_COL_WIDTH_PX, height: columnPx }}
        >
          {ref.overflow ? (
            <div
              className="flex flex-col items-center justify-end"
              style={{ height: columnPx }}
            >
              <div
                style={{ fontSize: refGlyphPx, lineHeight: 1 }}
                aria-hidden
              >
                {ref.object.glyph}
              </div>
              <div className="mt-1 text-xs text-stone-500 text-center">
                ×{ref.count.toFixed(1)}
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col-reverse items-center"
              style={{ height: columnPx }}
            >
              {Array.from({ length: stackedCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: refGlyphPx,
                    lineHeight: 1,
                    height: refGlyphPx,
                  }}
                  aria-hidden
                >
                  {ref.object.glyph}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs font-medium text-stone-500 text-center">
            {ref.object.label}
          </div>
        </div>
      </div>

      <div className="mt-2 border-t border-stone-200" />

      <div className="mt-4 text-center text-base text-stone-700">
        {ref.label}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-stone-600">
        <dt>Home value</dt>
        <dd className="text-right tabular-nums">
          ${result.assessedValue.toLocaleString()}
        </dd>
        <dt>Footprint area</dt>
        <dd className="text-right tabular-nums">
          {result.footprintAreaM2.toFixed(0)} m²
        </dd>
        <dt>{config.label} price</dt>
        <dd className="text-right tabular-nums">
          ${formatBigUSD(result.pricePerM3)} / m³
        </dd>
        <dt>Data source</dt>
        <dd className="text-right text-stone-500">
          {result.source.footprint === "manual"
            ? "manual entry"
            : `${result.source.footprint} · ${result.source.value}`}
        </dd>
      </dl>
    </section>
  );
}

function formatMeters(m: number): string {
  if (m < 0.1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatBigUSD(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/** Darken a #RRGGBB hex color by `amount` (0–1). Returns hex. */
function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = Math.max(0, Math.min(255, ((v >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.min(255, ((v >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.min(255, (v & 0xff) * (1 - amount)));
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}
