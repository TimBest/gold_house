import type { Polygon } from "./types";

const METERS_PER_DEG_LAT = 111_320;

export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };
export type ScreenPoint = { sx: number; sy: number };

export type CameraMode = "head-on" | "low-tilt" | "iso" | "wide-iso";

export type Camera = {
  mode: CameraMode;
  azimuthDeg: number;
  elevationDeg: number;
  /**
   * True when the tower dwarfs even the largest reference object — render
   * the reference as a single small marker rather than a stack.
   */
  showReferenceAsMarker: boolean;
};

/**
 * Choose the camera tier for a tower of `heightM`. The four-tier ladder
 * matches docs/NEXT_STEPS.md §P3 (spec sections 7–8):
 *   < 2 m     head-on   (0°/0°)
 *   2–50 m    low-tilt  (25°/18°)
 *   50–500 m  iso       (45°/30°)
 *   > 500 m   wide-iso  (45°/30°, reference as marker)
 */
export function pickCamera(heightM: number): Camera {
  if (heightM < 2) {
    return { mode: "head-on", azimuthDeg: 0, elevationDeg: 0, showReferenceAsMarker: false };
  }
  if (heightM < 50) {
    return { mode: "low-tilt", azimuthDeg: 25, elevationDeg: 18, showReferenceAsMarker: false };
  }
  if (heightM < 500) {
    return { mode: "iso", azimuthDeg: 45, elevationDeg: 30, showReferenceAsMarker: false };
  }
  return { mode: "wide-iso", azimuthDeg: 45, elevationDeg: 30, showReferenceAsMarker: true };
}

/**
 * Project a 3D point to screen coords by rotating around Z by `azimuthDeg`,
 * then around X by `elevationDeg`, then dropping the depth axis.
 *
 * At (az=45°, el=30°) this reduces to the textbook iso matrix used in the
 * spec: sx = (x - y)·cos30°, sy = (x + y)·sin30° − z.
 *
 * Screen `sy` increases downward, which matches SVG.
 */
export function project3D(p: Point3D, azimuthDeg: number, elevationDeg: number): ScreenPoint {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const cosA = Math.cos(az);
  const sinA = Math.sin(az);
  const cosE = Math.cos(el);
  const sinE = Math.sin(el);

  const x1 = p.x * cosA - p.y * sinA;
  const y1 = p.x * sinA + p.y * cosA;
  const sx = x1;
  const sy = -(y1 * sinE + p.z * cosE);
  return { sx, sy };
}

/**
 * Convert a lat/lng polygon to centroid-relative meters via local
 * equirectangular projection. Same constants as `polygonAreaM2` in
 * lib/math.ts; centroid-centered so the prism lands in the SVG center
 * regardless of footprint shape.
 */
export function polygonToLocalMeters(polygon: Polygon): Point2D[] {
  if (polygon.length === 0) return [];
  const lat0 = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const lng0 = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  return polygon.map((p) => ({
    x: (p.lng - lng0) * METERS_PER_DEG_LAT * cosLat,
    y: (p.lat - lat0) * METERS_PER_DEG_LAT,
  }));
}

export type SideFace = {
  /** Projected screen-space corners, in draw order. */
  points: ScreenPoint[];
  /** 0 (in deepest shadow) .. 1 (fully lit). */
  shade: number;
  /** Mean projected depth used for painter-algorithm sorting. */
  depth: number;
};

export type PrismGeometry = {
  topFace: ScreenPoint[];
  sideFaces: SideFace[];
  /** Projected centroid of the base, useful for placing a shadow ellipse. */
  baseCenter: ScreenPoint;
  baseRadius: number;
};

/**
 * Extrude a 2D footprint upward by `heightM` and project every face under
 * `camera`. Side faces are returned back-to-front so the caller can render
 * them with simple painter-algorithm ordering.
 */
export function extrudedPrismGeometry(
  footprintM: Point2D[],
  heightM: number,
  camera: Camera
): PrismGeometry {
  const az = camera.azimuthDeg;
  const el = camera.elevationDeg;

  const bottom3D: Point3D[] = footprintM.map((p) => ({ x: p.x, y: p.y, z: 0 }));
  const top3D: Point3D[] = footprintM.map((p) => ({ x: p.x, y: p.y, z: heightM }));

  const bottom2D = bottom3D.map((p) => project3D(p, az, el));
  const top2D = top3D.map((p) => project3D(p, az, el));

  // Mean depth of each face for back-to-front sorting. "Depth" here is the
  // pre-projection rotated Y axis: larger = closer to the viewer.
  const azRad = (az * Math.PI) / 180;
  const depthOf = (p: Point2D) => p.x * Math.sin(azRad) + p.y * Math.cos(azRad);

  const sideFaces: SideFace[] = [];
  const n = footprintM.length;
  for (let i = 0; i < n; i++) {
    const a = footprintM[i];
    const b = footprintM[(i + 1) % n];
    // Edge midpoint depth.
    const depth = (depthOf(a) + depthOf(b)) / 2;
    // Lighting: face normal is perpendicular to edge in the XY plane.
    // Angle between the (rotated) normal and a fixed light direction.
    const edgeAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const normalAngle = edgeAngle - Math.PI / 2;
    const lightAngle = (135 * Math.PI) / 180; // upper-left light
    const dot = Math.cos(normalAngle - lightAngle);
    const shade = 0.55 + 0.45 * Math.max(0, dot);

    sideFaces.push({
      points: [
        bottom2D[i],
        bottom2D[(i + 1) % n],
        top2D[(i + 1) % n],
        top2D[i],
      ],
      shade,
      depth,
    });
  }
  sideFaces.sort((a, b) => a.depth - b.depth);

  const baseCenter = bottom2D.reduce(
    (acc, p) => ({ sx: acc.sx + p.sx / bottom2D.length, sy: acc.sy + p.sy / bottom2D.length }),
    { sx: 0, sy: 0 }
  );
  const baseRadius =
    bottom2D.reduce(
      (m, p) => Math.max(m, Math.hypot(p.sx - baseCenter.sx, p.sy - baseCenter.sy)),
      0
    ) || 1;

  return {
    topFace: top2D,
    sideFaces,
    baseCenter,
    baseRadius,
  };
}

export type ViewBox = { minX: number; minY: number; width: number; height: number };

/**
 * Fit a set of screen-space points into a target viewBox of the given
 * pixel dimensions, preserving aspect ratio. Returns the viewBox plus the
 * scalar applied (so the caller can convert meters→px consistently for
 * other elements like reference stacks).
 */
export function fitToViewBox(
  points: ScreenPoint[],
  targetWidth: number,
  targetHeight: number,
  paddingPx: number
): { viewBox: ViewBox; scale: number; offset: ScreenPoint } {
  if (points.length === 0) {
    return {
      viewBox: { minX: 0, minY: 0, width: targetWidth, height: targetHeight },
      scale: 1,
      offset: { sx: 0, sy: 0 },
    };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.sx < minX) minX = p.sx;
    if (p.sx > maxX) maxX = p.sx;
    if (p.sy < minY) minY = p.sy;
    if (p.sy > maxY) maxY = p.sy;
  }
  const rawW = Math.max(1e-6, maxX - minX);
  const rawH = Math.max(1e-6, maxY - minY);
  const availW = Math.max(1, targetWidth - 2 * paddingPx);
  const availH = Math.max(1, targetHeight - 2 * paddingPx);
  const scale = Math.min(availW / rawW, availH / rawH);
  return {
    viewBox: { minX: 0, minY: 0, width: targetWidth, height: targetHeight },
    scale,
    offset: {
      sx: paddingPx + (availW - rawW * scale) / 2 - minX * scale,
      sy: paddingPx + (availH - rawH * scale) / 2 - minY * scale,
    },
  };
}

export function applyScale(p: ScreenPoint, scale: number, offset: ScreenPoint): ScreenPoint {
  return { sx: p.sx * scale + offset.sx, sy: p.sy * scale + offset.sy };
}

export function pointsToPathD(points: ScreenPoint[]): string {
  if (points.length === 0) return "";
  return (
    "M" +
    points.map((p) => `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(" L") +
    " Z"
  );
}
