"use client";

import { COMMODITIES } from "@/lib/commodities";
import { formatBigUSD, formatMeters } from "@/lib/formatting";
import {
  applyScale,
  extrudedPrismGeometry,
  fitToViewBox,
  pickCamera,
  pointsToPathD,
  polygonToLocalMeters,
  type Point2D,
  type ScreenPoint,
} from "@/lib/isoProjection";
import type { ComputeResult } from "@/lib/pipeline";
import type { ReferenceObject } from "@/lib/scaleReference";

const VIEWBOX_W = 480;
const VIEWBOX_H = 380;
const PADDING_PX = 28;
const MAX_RENDERED_STACK = 20;

// Width:height ratios mirror each SVG's own viewBox in /public/references.
const REFERENCE_ASPECT: Record<ReferenceObject["id"], number> = {
  "credit-card": 160 / 100,
  human: 60 / 170,
  "telephone-pole": 80 / 240,
  "statue-of-liberty": 120 / 360,
  "eiffel-tower": 200 / 400,
  "burj-khalifa": 200 / 600,
};

export function IsoViz({
  result,
}: {
  result: Extract<ComputeResult, { kind: "ok" }>;
}) {
  const config = COMMODITIES[result.commodity];
  const heightM = result.heightM;
  const ref = result.reference;
  const camera = pickCamera(heightM);

  const localFootprint: Point2D[] =
    result.polygon && result.polygon.length >= 3
      ? polygonToLocalMeters(result.polygon)
      : squareInMeters(result.footprintAreaM2);

  const geom = extrudedPrismGeometry(localFootprint, heightM, camera);

  const prismPts: ScreenPoint[] = [
    ...geom.topFace,
    ...geom.sideFaces.flatMap((f) => f.points),
  ];
  const prismMinSx = Math.min(...prismPts.map((p) => p.sx));
  const prismMaxSx = Math.max(...prismPts.map((p) => p.sx));

  const aspect = REFERENCE_ASPECT[ref.object.id];
  const refUnitHeight = ref.object.heightM;
  const refUnitWidth = refUnitHeight * aspect;

  const useCompact =
    camera.showReferenceAsMarker ||
    ref.overflow ||
    ref.count > MAX_RENDERED_STACK;
  const renderedCount = useCompact
    ? 1
    : Math.max(1, Math.min(ref.count, MAX_RENDERED_STACK));

  // In wide-iso mode the reference shrinks to roughly 15% of tower height
  // so it stays visible alongside a 500+ m prism.
  const markerScale = camera.showReferenceAsMarker
    ? Math.min(1, (heightM * 0.15) / Math.max(refUnitHeight, 1e-6))
    : 1;
  const drawUnitHeight = refUnitHeight * markerScale;
  const drawUnitWidth = refUnitWidth * markerScale;
  const refColumnHeight = drawUnitHeight * renderedCount;

  // Gap in the same screen-meter units as the prism. Scales with the larger
  // of the prism's projected width and the tower height so the spacing
  // never collapses.
  const gap = Math.max(
    (prismMaxSx - prismMinSx) * 0.12,
    heightM * 0.05,
    drawUnitWidth * 0.5,
    1
  );
  const refLeft = prismMaxSx + gap;
  const refRight = refLeft + drawUnitWidth;

  const allPoints: ScreenPoint[] = [
    ...prismPts,
    { sx: refLeft, sy: 0 },
    { sx: refRight, sy: 0 },
    { sx: refLeft, sy: -refColumnHeight },
    { sx: refRight, sy: -refColumnHeight },
  ];
  const { viewBox, scale, offset } = fitToViewBox(
    allPoints,
    VIEWBOX_W,
    VIEWBOX_H,
    PADDING_PX
  );

  const topFacePx = geom.topFace.map((p) => applyScale(p, scale, offset));
  const sideFacesPx = geom.sideFaces.map((f) => ({
    points: f.points.map((p) => applyScale(p, scale, offset)),
    shade: f.shade,
  }));
  const baseCenterPx = applyScale(geom.baseCenter, scale, offset);
  const baseRadiusPx = geom.baseRadius * scale;

  const refGlyphs: { x: number; y: number; w: number; h: number; key: number }[] = [];
  for (let i = 0; i < renderedCount; i++) {
    const bottomLeft = applyScale(
      { sx: refLeft, sy: -i * drawUnitHeight },
      scale,
      offset
    );
    const pxW = drawUnitWidth * scale;
    const pxH = drawUnitHeight * scale;
    refGlyphs.push({
      key: i,
      x: bottomLeft.sx,
      y: bottomLeft.sy - pxH,
      w: pxW,
      h: pxH,
    });
  }

  const compactMultiplier =
    useCompact && ref.count > 1
      ? ref.overflow
        ? `×${ref.count.toFixed(1)}`
        : `×${ref.count}`
      : null;

  const darkColor = darken(config.color, 0.22);
  const sideColor = (shade: number) => mix(darkColor, config.color, shade);
  const stroke = darken(config.color, 0.45);
  const prismLabelX = baseCenterPx.sx;
  const prismLabelY = Math.min(VIEWBOX_H - 8, baseCenterPx.sy + 18);
  const refLabel = refGlyphs[refGlyphs.length - 1];
  const refLabelX = refLabel
    ? refLabel.x + refLabel.w / 2
    : applyScale({ sx: refLeft, sy: 0 }, scale, offset).sx;

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

      <div className="mt-6 flex justify-center">
        <svg
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          width="100%"
          style={{ maxWidth: VIEWBOX_W, height: "auto" }}
          role="img"
          aria-label={`Isometric visualization: ${formatMeters(
            heightM
          )} tower of ${config.label.toLowerCase()} next to ${ref.label}`}
        >
          <ellipse
            cx={baseCenterPx.sx}
            cy={baseCenterPx.sy + 3}
            rx={baseRadiusPx * 1.1}
            ry={Math.max(2, baseRadiusPx * 0.22)}
            fill="rgba(0,0,0,0.14)"
          />

          <g>
            {sideFacesPx.map((f, i) => (
              <path
                key={i}
                d={pointsToPathD(f.points)}
                stroke={stroke}
                strokeWidth={0.6}
                strokeLinejoin="round"
                style={{
                  fill: sideColor(f.shade),
                  transition: "fill 600ms ease-in-out",
                }}
              />
            ))}
            <path
              d={pointsToPathD(topFacePx)}
              stroke={stroke}
              strokeWidth={0.6}
              strokeLinejoin="round"
              style={{
                fill: config.color,
                transition: "fill 600ms ease-in-out",
              }}
            />
          </g>

          <g aria-hidden>
            {refGlyphs.map((g) => (
              <image
                key={g.key}
                href={`/references/${ref.object.svgFile}`}
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                preserveAspectRatio="xMidYMax meet"
              />
            ))}
            {compactMultiplier && refGlyphs[0] && (
              <text
                x={refGlyphs[0].x + refGlyphs[0].w / 2}
                y={refGlyphs[0].y - 4}
                textAnchor="middle"
                fontSize="12"
                fontFamily="ui-sans-serif, system-ui"
                fill="#475569"
              >
                {compactMultiplier}
              </text>
            )}
          </g>

          <text
            x={prismLabelX}
            y={prismLabelY}
            textAnchor="middle"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
            fill="#78716c"
          >
            {config.emoji} {config.label}
          </text>
          {refGlyphs[0] && (
            <text
              x={refLabelX}
              y={prismLabelY}
              textAnchor="middle"
              fontSize="11"
              fontFamily="ui-sans-serif, system-ui"
              fill="#78716c"
            >
              {ref.object.label}
            </text>
          )}
        </svg>
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
        <dt>Camera</dt>
        <dd className="text-right text-stone-500">{camera.mode}</dd>
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

function squareInMeters(areaM2: number): Point2D[] {
  const side = Math.sqrt(Math.max(1, areaM2));
  const h = side / 2;
  return [
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ];
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
    [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
  );
}

function mix(hexA: string, hexB: string, t: number): string {
  const ma = /^#?([0-9a-f]{6})$/i.exec(hexA);
  const mb = /^#?([0-9a-f]{6})$/i.exec(hexB);
  if (!ma || !mb) return hexB;
  const va = parseInt(ma[1], 16);
  const vb = parseInt(mb[1], 16);
  const r = ((va >> 16) & 0xff) * (1 - t) + ((vb >> 16) & 0xff) * t;
  const g = ((va >> 8) & 0xff) * (1 - t) + ((vb >> 8) & 0xff) * t;
  const b = (va & 0xff) * (1 - t) + (vb & 0xff) * t;
  return (
    "#" +
    [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
  );
}
