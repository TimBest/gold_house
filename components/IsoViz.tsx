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
import { pickReference, type ReferenceObject } from "@/lib/scaleReference";
import type { CommodityId, CommodityPrices } from "@/lib/types";

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
  prices,
}: {
  result: Extract<ComputeResult, { kind: "ok" }>;
  prices: CommodityPrices;
}) {
  const config = COMMODITIES[result.commodity];
  const heightM = result.heightM;
  const ref = result.reference;

  // Compute alt-commodity heights so the camera, viewBox, and reference
  // column can all be locked to the tallest commodity for this home. Then
  // only the prism's CSS scaleY changes between commodity selections,
  // letting the shape transition smoothly over 600 ms.
  const altHeights = (Object.keys(COMMODITIES) as CommodityId[]).map(
    (id) =>
      result.assessedValue /
      (prices[id].pricePerM3 * result.footprintAreaM2)
  );
  const maxAltHeight = Math.max(heightM, ...altHeights);

  const camera = pickCamera(maxAltHeight);
  const phantomReference = pickReference(maxAltHeight);

  const localFootprint: Point2D[] =
    result.polygon && result.polygon.length >= 3
      ? polygonToLocalMeters(result.polygon)
      : squareInMeters(result.footprintAreaM2);

  // Phantom geometry: never drawn — sized to the tallest commodity, used
  // only so fitToViewBox produces a layout that fits any commodity.
  const phantomGeom = extrudedPrismGeometry(
    localFootprint,
    maxAltHeight,
    camera
  );

  // Unit geometry: actually drawn. Top is at z=1 in world; CSS
  // `scaleY(heightM)` restores the real extrusion height because
  // project3D is linear in z (see lib/isoProjection.ts).
  const unitGeom = extrudedPrismGeometry(localFootprint, 1, camera);

  // Reference column slot is sized to the phantom (max) reference so any
  // commodity's actual reference fits inside it.
  const phantomRefAspect = REFERENCE_ASPECT[phantomReference.object.id];
  const phantomUseCompact =
    camera.showReferenceAsMarker ||
    phantomReference.overflow ||
    phantomReference.count > MAX_RENDERED_STACK;
  const phantomRenderedCount = phantomUseCompact
    ? 1
    : Math.max(1, Math.min(phantomReference.count, MAX_RENDERED_STACK));
  const phantomMarkerScale = camera.showReferenceAsMarker
    ? Math.min(
        1,
        (maxAltHeight * 0.15) /
          Math.max(phantomReference.object.heightM, 1e-6)
      )
    : 1;
  const phantomDrawUnitHeight =
    phantomReference.object.heightM * phantomMarkerScale;
  const phantomDrawUnitWidth = phantomDrawUnitHeight * phantomRefAspect;
  const phantomRefColumnHeight = phantomDrawUnitHeight * phantomRenderedCount;

  const phantomPrismPts: ScreenPoint[] = [
    ...phantomGeom.topFace,
    ...phantomGeom.sideFaces.flatMap((f) => f.points),
  ];
  const phantomMinSx = Math.min(...phantomPrismPts.map((p) => p.sx));
  const phantomMaxSx = Math.max(...phantomPrismPts.map((p) => p.sx));

  const gap = Math.max(
    (phantomMaxSx - phantomMinSx) * 0.12,
    maxAltHeight * 0.05,
    phantomDrawUnitWidth * 0.5,
    1
  );
  const refLeft = phantomMaxSx + gap;
  const refRight = refLeft + phantomDrawUnitWidth;

  const layoutPoints: ScreenPoint[] = [
    ...phantomPrismPts,
    { sx: refLeft, sy: 0 },
    { sx: refRight, sy: 0 },
    { sx: refLeft, sy: -phantomRefColumnHeight },
    { sx: refRight, sy: -phantomRefColumnHeight },
  ];
  const { viewBox, scale, offset } = fitToViewBox(
    layoutPoints,
    VIEWBOX_W,
    VIEWBOX_H,
    PADDING_PX
  );

  const topFacePx = unitGeom.topFace.map((p) => applyScale(p, scale, offset));
  const sideFacesPx = unitGeom.sideFaces.map((f) => ({
    points: f.points.map((p) => applyScale(p, scale, offset)),
    shade: f.shade,
  }));
  const baseCenterPx = applyScale(unitGeom.baseCenter, scale, offset);
  const baseRadiusPx = unitGeom.baseRadius * scale;

  const actualRefAspect = REFERENCE_ASPECT[ref.object.id];
  const useCompact =
    camera.showReferenceAsMarker ||
    ref.overflow ||
    ref.count > MAX_RENDERED_STACK;
  const renderedCount = useCompact
    ? 1
    : Math.max(1, Math.min(ref.count, MAX_RENDERED_STACK));
  const actualMarkerScale = camera.showReferenceAsMarker
    ? Math.min(1, (heightM * 0.15) / Math.max(ref.object.heightM, 1e-6))
    : 1;
  const actualDrawUnitHeight = ref.object.heightM * actualMarkerScale;
  const actualDrawUnitWidth = actualDrawUnitHeight * actualRefAspect;

  const refGlyphs: { x: number; y: number; w: number; h: number; key: number }[] = [];
  for (let i = 0; i < renderedCount; i++) {
    const bottomLeft = applyScale(
      { sx: refLeft, sy: -i * actualDrawUnitHeight },
      scale,
      offset
    );
    const pxW = actualDrawUnitWidth * scale;
    const pxH = actualDrawUnitHeight * scale;
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

          <g
            style={{
              transform: `scaleY(${heightM})`,
              transformOrigin: `${baseCenterPx.sx}px ${baseCenterPx.sy}px`,
              transition: "transform 600ms ease-in-out",
            }}
          >
            {sideFacesPx.map((f, i) => (
              <path
                key={i}
                d={pointsToPathD(f.points)}
                stroke={stroke}
                strokeWidth={0.6}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
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
              vectorEffect="non-scaling-stroke"
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
