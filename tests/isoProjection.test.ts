import { describe, expect, test } from "bun:test";
import {
  extrudedPrismGeometry,
  fitToViewBox,
  pickCamera,
  polygonToLocalMeters,
  project3D,
} from "@/lib/isoProjection";

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);

describe("project3D", () => {
  test("at (az=0, el=0) reduces to a pure front elevation (x, -z)", () => {
    const p = project3D({ x: 7, y: 13, z: 5 }, 0, 0);
    expect(p.sx).toBeCloseTo(7, 10);
    expect(p.sy).toBeCloseTo(-5, 10);
  });

  test("at (az=45°, el=30°) matches the spec's iso matrix", () => {
    // Spec: sx = (x - y)·cos30°, sy = (x + y)·sin30° − z
    const samples = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 3, y: -2, z: 4 },
    ];
    for (const pt of samples) {
      const got = project3D(pt, 45, 30);
      const rotatedX = (pt.x - pt.y) / Math.SQRT2;
      const rotatedY = (pt.x + pt.y) / Math.SQRT2;
      const expectedSx = rotatedX;
      const expectedSy = -(rotatedY * SIN30 + pt.z * COS30);
      expect(got.sx).toBeCloseTo(expectedSx, 10);
      expect(got.sy).toBeCloseTo(expectedSy, 10);
    }
  });

  test("origin always projects to (0,0)", () => {
    for (const [az, el] of [[0, 0], [25, 18], [45, 30], [90, 60]]) {
      const p = project3D({ x: 0, y: 0, z: 0 }, az, el);
      expect(p.sx).toBeCloseTo(0, 10);
      expect(p.sy).toBeCloseTo(0, 10);
    }
  });
});

describe("pickCamera", () => {
  test("picks head-on below 2 m", () => {
    expect(pickCamera(0.5).mode).toBe("head-on");
    expect(pickCamera(1.9).mode).toBe("head-on");
  });

  test("picks low-tilt in [2, 50)", () => {
    expect(pickCamera(2.0).mode).toBe("low-tilt");
    expect(pickCamera(2.1).mode).toBe("low-tilt");
    expect(pickCamera(49.9).mode).toBe("low-tilt");
  });

  test("picks iso in [50, 500)", () => {
    expect(pickCamera(50).mode).toBe("iso");
    expect(pickCamera(50.1).mode).toBe("iso");
    expect(pickCamera(499.9).mode).toBe("iso");
  });

  test("picks wide-iso at 500+ with reference-as-marker flag", () => {
    expect(pickCamera(500).mode).toBe("wide-iso");
    expect(pickCamera(500).showReferenceAsMarker).toBe(true);
    expect(pickCamera(5000).mode).toBe("wide-iso");
  });

  test("iso tier uses 45°/30° matching the spec", () => {
    const c = pickCamera(100);
    expect(c.azimuthDeg).toBe(45);
    expect(c.elevationDeg).toBe(30);
  });
});

describe("polygonToLocalMeters", () => {
  test("converts a small square to ~its expected side length in meters", () => {
    // 100m square at 40°N: 100m / 111_320 ≈ 0.000898° lat;
    // adjusted for cos(40°) ≈ 0.766 for the lng leg.
    const lat0 = 40;
    const lng0 = -74;
    const halfLatDeg = 50 / 111_320;
    const halfLngDeg = 50 / (111_320 * Math.cos((lat0 * Math.PI) / 180));
    const square = [
      { lat: lat0 - halfLatDeg, lng: lng0 - halfLngDeg },
      { lat: lat0 - halfLatDeg, lng: lng0 + halfLngDeg },
      { lat: lat0 + halfLatDeg, lng: lng0 + halfLngDeg },
      { lat: lat0 + halfLatDeg, lng: lng0 - halfLngDeg },
    ];
    const local = polygonToLocalMeters(square);
    // Width and height should both be ~100 m within 0.1%.
    const xs = local.map((p) => p.x);
    const ys = local.map((p) => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width).toBeGreaterThan(99.9);
    expect(width).toBeLessThan(100.1);
    expect(height).toBeGreaterThan(99.9);
    expect(height).toBeLessThan(100.1);
  });

  test("centers polygon at its centroid", () => {
    const square = [
      { lat: 40, lng: -74 },
      { lat: 40, lng: -73.999 },
      { lat: 40.001, lng: -73.999 },
      { lat: 40.001, lng: -74 },
    ];
    const local = polygonToLocalMeters(square);
    const meanX = local.reduce((s, p) => s + p.x, 0) / local.length;
    const meanY = local.reduce((s, p) => s + p.y, 0) / local.length;
    expect(meanX).toBeCloseTo(0, 6);
    expect(meanY).toBeCloseTo(0, 6);
  });

  test("returns empty array for empty input", () => {
    expect(polygonToLocalMeters([])).toEqual([]);
  });
});

describe("extrudedPrismGeometry", () => {
  test("unit square gives 1 top face + 4 side faces at iso", () => {
    const footprint = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    const camera = pickCamera(100);
    const geom = extrudedPrismGeometry(footprint, 5, camera);
    expect(geom.topFace).toHaveLength(4);
    expect(geom.sideFaces).toHaveLength(4);
    geom.sideFaces.forEach((f) => {
      expect(f.points).toHaveLength(4);
      expect(f.shade).toBeGreaterThan(0);
      expect(f.shade).toBeLessThanOrEqual(1);
    });
  });

  test("side faces are sorted back-to-front for painter ordering", () => {
    const footprint = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    const geom = extrudedPrismGeometry(footprint, 5, pickCamera(100));
    for (let i = 1; i < geom.sideFaces.length; i++) {
      expect(geom.sideFaces[i].depth).toBeGreaterThanOrEqual(geom.sideFaces[i - 1].depth);
    }
  });

  test("top face sits above the base center in screen coords (sy is smaller)", () => {
    const footprint = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    const geom = extrudedPrismGeometry(footprint, 10, pickCamera(100));
    const meanTopSy =
      geom.topFace.reduce((s, p) => s + p.sy, 0) / geom.topFace.length;
    // Screen +sy is downward; the top face should be above the base center.
    expect(meanTopSy).toBeLessThan(geom.baseCenter.sy);
  });
});

describe("fitToViewBox", () => {
  test("returns identity-ish output for empty input", () => {
    const r = fitToViewBox([], 200, 100, 8);
    expect(r.viewBox).toEqual({ minX: 0, minY: 0, width: 200, height: 100 });
    expect(r.scale).toBe(1);
  });

  test("scales a 10x10 bounding box into a 100x100 (-padding) viewBox", () => {
    const pts = [
      { sx: 0, sy: 0 },
      { sx: 10, sy: 0 },
      { sx: 10, sy: 10 },
      { sx: 0, sy: 10 },
    ];
    const r = fitToViewBox(pts, 100, 100, 10);
    // available = 80x80, raw = 10x10 → scale = 8.
    expect(r.scale).toBeCloseTo(8, 6);
  });
});
