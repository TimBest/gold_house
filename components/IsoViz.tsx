"use client";

import { COMMODITIES } from "@/lib/commodities";
import { formatBigUSD, formatMeters } from "@/lib/formatting";
import type { ComputeResult } from "@/lib/pipeline";
import type { ReferencePick } from "@/lib/scaleReference";

const VIZ_HEIGHT_PX = 360;
const COLUMN_WIDTH_PX = 88;
const REFERENCE_COL_WIDTH_PX = 64;
// Hard cap on stacked glyphs to keep DOM bounded; beyond this we render
// the overflow form (×N) even when the reference math has count <= cap.
const MAX_RENDERED_STACK = 20;
const MIN_GLYPH_PX = 14;
const MAX_GLYPH_PX = 140;

export function IsoViz({
  result,
}: {
  result: Extract<ComputeResult, { kind: "ok" }>;
}) {
  const config = COMMODITIES[result.commodity];
  const heightM = result.heightM;
  const ref = result.reference;

  const pxPerMeter = VIZ_HEIGHT_PX / heightM;
  const refGlyphPx = Math.max(
    MIN_GLYPH_PX,
    Math.min(MAX_GLYPH_PX, ref.object.heightM * pxPerMeter)
  );
  const darkColor = darken(config.color, 0.18);

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
        <CommodityColumn
          emoji={config.emoji}
          label={config.label}
          lightColor={config.color}
          darkColor={darkColor}
        />
        <ReferenceStack ref={ref} glyphPx={refGlyphPx} />
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

function CommodityColumn({
  emoji,
  label,
  lightColor,
  darkColor,
}: {
  emoji: string;
  label: string;
  lightColor: string;
  darkColor: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex overflow-hidden rounded-t-md shadow-sm"
        style={{ width: COLUMN_WIDTH_PX, height: VIZ_HEIGHT_PX }}
      >
        <div
          style={{
            background: lightColor,
            width: "70%",
            borderRight: `1px solid ${darkColor}`,
          }}
        />
        <div style={{ background: darkColor, width: "30%" }} />
      </div>
      <div className="mt-2 text-xs font-medium text-stone-500">
        {emoji} {label}
      </div>
    </div>
  );
}

function ReferenceStack({
  ref,
  glyphPx,
}: {
  ref: ReferencePick;
  glyphPx: number;
}) {
  const stackedCount = ref.overflow ? Math.floor(ref.count) : ref.count;
  const tooManyToStack = stackedCount > MAX_RENDERED_STACK;
  const useCompact = ref.overflow || tooManyToStack;

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: REFERENCE_COL_WIDTH_PX, height: VIZ_HEIGHT_PX }}
    >
      {useCompact ? (
        <CompactReference ref={ref} glyphPx={glyphPx} />
      ) : (
        <StackedReference
          glyph={ref.object.glyph}
          count={stackedCount}
          glyphPx={glyphPx}
        />
      )}
      <div className="mt-2 text-xs font-medium text-stone-500 text-center">
        {ref.object.label}
      </div>
    </div>
  );
}

function CompactReference({
  ref,
  glyphPx,
}: {
  ref: ReferencePick;
  glyphPx: number;
}) {
  const multiplier = ref.overflow ? ref.count.toFixed(1) : String(ref.count);
  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ height: VIZ_HEIGHT_PX }}
    >
      <div style={{ fontSize: glyphPx, lineHeight: 1 }} aria-hidden>
        {ref.object.glyph}
      </div>
      <div className="mt-1 text-xs text-stone-500 text-center">
        ×{multiplier}
      </div>
    </div>
  );
}

function StackedReference({
  glyph,
  count,
  glyphPx,
}: {
  glyph: string;
  count: number;
  glyphPx: number;
}) {
  return (
    <div
      className="flex flex-col-reverse items-center"
      style={{ height: VIZ_HEIGHT_PX }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ fontSize: glyphPx, lineHeight: 1, height: glyphPx }}
          aria-hidden
        >
          {glyph}
        </div>
      ))}
    </div>
  );
}

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
