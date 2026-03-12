import { ugandaRegions } from "@/lib/uganda-locations";

export type UgandaMapSubRegionName =
  | "Acholi"
  | "Central"
  | "East Central"
  | "Elgon"
  | "Karamoja"
  | "Lango"
  | "South Western"
  | "Teso"
  | "West Nile"
  | "Western";

export type UgandaMapRegionName =
  | "Central Region"
  | "Eastern Region"
  | "Northern Region"
  | "Western Region";

export type UgandaMapSubRegionEntry = {
  subRegion: UgandaMapSubRegionName;
  region: UgandaMapRegionName;
  districts: string[];
};

const REGION_FOR_SUB_REGION: Record<UgandaMapSubRegionName, UgandaMapRegionName> = {
  Acholi: "Northern Region",
  Central: "Central Region",
  "East Central": "Eastern Region",
  Elgon: "Eastern Region",
  Karamoja: "Northern Region",
  Lango: "Northern Region",
  "South Western": "Western Region",
  Teso: "Eastern Region",
  "West Nile": "Northern Region",
  Western: "Western Region",
};

const LEGACY_TO_MAP_SUB_REGION: Record<string, UgandaMapSubRegionName> = {
  Acholi: "Acholi",
  Lango: "Lango",
  "West Nile": "West Nile",
  Karamoja: "Karamoja",
  Teso: "Teso",
  Busoga: "East Central",
  Bugisu: "Elgon",
  Bukedi: "Elgon",
  Sebei: "Elgon",
  Buganda: "Central",
  Ankole: "South Western",
  Kigezi: "South Western",
  Bunyoro: "Western",
  Tooro: "Western",
};

const MAP_SUB_REGION_ORDER: UgandaMapSubRegionName[] = [
  "West Nile",
  "Acholi",
  "Karamoja",
  "Lango",
  "Teso",
  "Elgon",
  "Western",
  "Central",
  "East Central",
  "South Western",
];

const districtToLegacySubRegion = new Map<string, string>();
ugandaRegions.forEach((region) => {
  region.subRegions.forEach((subRegion) => {
    subRegion.districts.forEach((district) => {
      districtToLegacySubRegion.set(district, subRegion.subRegion);
    });
  });
});

const mapSubRegionDistricts = new Map<UgandaMapSubRegionName, Set<string>>();
MAP_SUB_REGION_ORDER.forEach((entry) => {
  mapSubRegionDistricts.set(entry, new Set<string>());
});

districtToLegacySubRegion.forEach((legacySubRegion, district) => {
  const mapSubRegion = LEGACY_TO_MAP_SUB_REGION[legacySubRegion];
  if (!mapSubRegion) {
    return;
  }
  mapSubRegionDistricts.get(mapSubRegion)?.add(district);
});

export const UGANDA_MAP_SUB_REGIONS: UgandaMapSubRegionEntry[] = MAP_SUB_REGION_ORDER.map(
  (subRegion) => ({
    subRegion,
    region: REGION_FOR_SUB_REGION[subRegion],
    districts: [...(mapSubRegionDistricts.get(subRegion) ?? new Set<string>())].sort((a, b) =>
      a.localeCompare(b),
    ),
  }),
);

const districtToMapSubRegion = new Map<string, UgandaMapSubRegionName>();
UGANDA_MAP_SUB_REGIONS.forEach((entry) => {
  entry.districts.forEach((district) => {
    districtToMapSubRegion.set(district, entry.subRegion);
  });
});

export function inferMapSubRegionFromDistrict(district: string): UgandaMapSubRegionName | null {
  if (!district) {
    return null;
  }
  if (districtToMapSubRegion.has(district)) {
    return districtToMapSubRegion.get(district) ?? null;
  }

  // Handle common naming variants from data entry.
  const normalized = district.replace(/\s+/g, "").replace(/-/g, "").toLowerCase();
  for (const [knownDistrict, mapped] of districtToMapSubRegion.entries()) {
    const knownNormalized = knownDistrict.replace(/\s+/g, "").replace(/-/g, "").toLowerCase();
    if (knownNormalized === normalized) {
      return mapped;
    }
  }
  return null;
}

export function getMapSubRegionsByRegion(region: string) {
  return UGANDA_MAP_SUB_REGIONS.filter((entry) => entry.region === region);
}

export function getDistrictsByMapSubRegion(subRegion: string) {
  return (
    UGANDA_MAP_SUB_REGIONS.find((entry) => entry.subRegion === subRegion)?.districts ?? []
  );
}

export function getDistrictsByAnySubRegionName(subRegion: string) {
  const fromMap = getDistrictsByMapSubRegion(subRegion);
  if (fromMap.length > 0) {
    return fromMap;
  }
  const fromLegacy = ugandaRegions
    .flatMap((entry) => entry.subRegions)
    .find((entry) => entry.subRegion === subRegion)?.districts;
  return fromLegacy ?? [];
}

export const UGANDA_SUB_REGION_MAP_OVERLAYS: Array<{
  subRegion: UgandaMapSubRegionName;
  label: string;
  points: string;
  labelX: number;
  labelY: number;
}> = [
  {
    subRegion: "West Nile",
    label: "West Nile",
    points: "128,118 200,86 252,122 240,210 175,238 118,190",
    labelX: 188,
    labelY: 156,
  },
  {
    subRegion: "Acholi",
    label: "Acholi",
    points: "234,90 410,86 476,152 396,226 262,224 236,154",
    labelX: 348,
    labelY: 142,
  },
  {
    subRegion: "Karamoja",
    label: "Karamoja",
    points: "420,84 542,54 640,128 640,248 548,292 468,226 476,152",
    labelX: 544,
    labelY: 166,
  },
  {
    subRegion: "Lango",
    label: "Lango",
    points: "250,220 396,226 436,270 404,336 300,350 238,294",
    labelX: 328,
    labelY: 268,
  },
  {
    subRegion: "Teso",
    label: "Teso",
    points: "404,252 520,236 566,320 526,396 438,398 404,336",
    labelX: 492,
    labelY: 284,
  },
  {
    subRegion: "Elgon",
    label: "Elgon",
    points: "522,318 636,300 650,436 566,494 500,432",
    labelX: 574,
    labelY: 386,
  },
  {
    subRegion: "Western",
    label: "Western",
    points: "124,236 238,292 236,352 186,394 168,506 120,504 80,424 76,312",
    labelX: 146,
    labelY: 356,
  },
  {
    subRegion: "Central",
    label: "Central",
    points: "236,350 362,386 438,610 220,612 170,506 184,392",
    labelX: 288,
    labelY: 500,
  },
  {
    subRegion: "East Central",
    label: "East Central",
    points: "360,386 500,432 498,612 438,612 354,508 346,430",
    labelX: 430,
    labelY: 440,
  },
  {
    subRegion: "South Western",
    label: "South Western",
    points: "120,502 220,612 82,654 36,624 30,546 74,502",
    labelX: 116,
    labelY: 574,
  },
];

const SOURCE_MAP_WIDTH = 709;
const SOURCE_MAP_HEIGHT = 709;
const TARGET_MAP_WIDTH = 1248;
const TARGET_MAP_HEIGHT = 1198.499964;

const SCALE_X = TARGET_MAP_WIDTH / SOURCE_MAP_WIDTH;
const SCALE_Y = TARGET_MAP_HEIGHT / SOURCE_MAP_HEIGHT;

export const UGANDA_MAP_DIMENSIONS = {
  sourceWidth: SOURCE_MAP_WIDTH,
  sourceHeight: SOURCE_MAP_HEIGHT,
  targetWidth: TARGET_MAP_WIDTH,
  targetHeight: TARGET_MAP_HEIGHT,
  scaleX: SCALE_X,
  scaleY: SCALE_Y,
};

function parsePoints(points: string) {
  return points
    .split(/\s+/)
    .map((pair) => pair.split(",").map((value) => Number(value)))
    .filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([x, y]) => ({ x, y }));
}

function toTargetPoint(x: number, y: number) {
  return {
    x: Number((x * SCALE_X).toFixed(2)),
    y: Number((y * SCALE_Y).toFixed(2)),
  };
}

export function stableDistrictId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stableSubRegionId(name: UgandaMapSubRegionName) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const UGANDA_SUB_REGION_MAP_OVERLAYS_SCALED = UGANDA_SUB_REGION_MAP_OVERLAYS.map(
  (entry) => {
    const scaledPoints = parsePoints(entry.points)
      .map((point) => toTargetPoint(point.x, point.y))
      .map((point) => `${point.x},${point.y}`)
      .join(" ");

    const scaledLabel = toTargetPoint(entry.labelX, entry.labelY);

    return {
      ...entry,
      pointsScaled: scaledPoints,
      labelXScaled: scaledLabel.x,
      labelYScaled: scaledLabel.y,
      subRegionId: stableSubRegionId(entry.subRegion),
    };
  },
);

type MapPoint = { x: number; y: number };
type Rect = { left: number; right: number; top: number; bottom: number };

export type UgandaDistrictOverlayPath = {
  district: string;
  districtId: string;
  subRegion: UgandaMapSubRegionName;
  subRegionId: string;
  pathData: string;
  centroidX: number;
  centroidY: number;
};

export type UgandaDistrictOverlayMarker = {
  district: string;
  districtId: string;
  subRegion: UgandaMapSubRegionName;
  subRegionId: string;
  cx: number;
  cy: number;
};

function polygonBounds(points: MapPoint[]) {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function clipSegmentToVertical(
  from: MapPoint,
  to: MapPoint,
  x: number,
): MapPoint {
  const denominator = to.x - from.x;
  if (Math.abs(denominator) < 1e-6) {
    return { x, y: from.y };
  }
  const t = (x - from.x) / denominator;
  return { x, y: from.y + (to.y - from.y) * t };
}

function clipSegmentToHorizontal(
  from: MapPoint,
  to: MapPoint,
  y: number,
): MapPoint {
  const denominator = to.y - from.y;
  if (Math.abs(denominator) < 1e-6) {
    return { x: from.x, y };
  }
  const t = (y - from.y) / denominator;
  return { x: from.x + (to.x - from.x) * t, y };
}

function clipPolygonAgainstEdge(
  points: MapPoint[],
  inside: (point: MapPoint) => boolean,
  intersection: (from: MapPoint, to: MapPoint) => MapPoint,
) {
  if (points.length === 0) {
    return [];
  }
  const output: MapPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as MapPoint;
    const previous = points[(index + points.length - 1) % points.length] as MapPoint;
    const currentInside = inside(current);
    const previousInside = inside(previous);

    if (currentInside) {
      if (!previousInside) {
        output.push(intersection(previous, current));
      }
      output.push(current);
    } else if (previousInside) {
      output.push(intersection(previous, current));
    }
  }
  return output;
}

function clipPolygonByRect(points: MapPoint[], rect: Rect) {
  let clipped = points;
  clipped = clipPolygonAgainstEdge(
    clipped,
    (point) => point.x >= rect.left,
    (from, to) => clipSegmentToVertical(from, to, rect.left),
  );
  clipped = clipPolygonAgainstEdge(
    clipped,
    (point) => point.x <= rect.right,
    (from, to) => clipSegmentToVertical(from, to, rect.right),
  );
  clipped = clipPolygonAgainstEdge(
    clipped,
    (point) => point.y >= rect.top,
    (from, to) => clipSegmentToHorizontal(from, to, rect.top),
  );
  clipped = clipPolygonAgainstEdge(
    clipped,
    (point) => point.y <= rect.bottom,
    (from, to) => clipSegmentToHorizontal(from, to, rect.bottom),
  );
  return clipped;
}

function polygonCentroid(points: MapPoint[]) {
  if (points.length < 3) {
    const fallbackX =
      points.reduce((sum, point) => sum + point.x, 0) / Math.max(1, points.length);
    const fallbackY =
      points.reduce((sum, point) => sum + point.y, 0) / Math.max(1, points.length);
    return { x: fallbackX, y: fallbackY };
  }

  let area = 0;
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as MapPoint;
    const next = points[(index + 1) % points.length] as MapPoint;
    const factor = current.x * next.y - next.x * current.y;
    area += factor;
    sumX += (current.x + next.x) * factor;
    sumY += (current.y + next.y) * factor;
  }
  if (Math.abs(area) < 1e-6) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }
  return {
    x: sumX / (3 * area),
    y: sumY / (3 * area),
  };
}

function markerPointInPolygonFallback(
  points: MapPoint[],
  index: number,
  total: number,
) {
  const bounds = polygonBounds(points);
  const columns = Math.max(2, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(2, Math.ceil(total / columns));
  const col = index % columns;
  const row = Math.floor(index / columns);

  const paddingX = bounds.width * 0.16;
  const paddingY = bounds.height * 0.16;
  const x =
    bounds.minX +
    paddingX +
    ((bounds.width - paddingX * 2) / Math.max(1, columns - 1)) * col;
  const y =
    bounds.minY +
    paddingY +
    ((bounds.height - paddingY * 2) / Math.max(1, rows - 1)) * row;
  return { x, y };
}

const DISTRICT_OVERLAY_PATHS: UgandaDistrictOverlayPath[] = UGANDA_SUB_REGION_MAP_OVERLAYS.flatMap(
  (overlay) => {
    const districts = getDistrictsByMapSubRegion(overlay.subRegion);
    if (districts.length === 0) {
      return [];
    }

    const sourcePolygon = parsePoints(overlay.points);
    const bounds = polygonBounds(sourcePolygon);
    const columns = Math.max(2, Math.ceil(Math.sqrt(districts.length)));
    const rows = Math.max(2, Math.ceil(districts.length / columns));
    const cellWidth = bounds.width / columns;
    const cellHeight = bounds.height / rows;

    return districts.map((district, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const rect: Rect = {
        left: bounds.minX + col * cellWidth,
        right: bounds.minX + (col + 1) * cellWidth,
        top: bounds.minY + row * cellHeight,
        bottom: bounds.minY + (row + 1) * cellHeight,
      };

      let clipped = clipPolygonByRect(sourcePolygon, rect);
      if (clipped.length < 3) {
        const fallbackCenter = markerPointInPolygonFallback(
          sourcePolygon,
          index,
          districts.length,
        );
        const fallbackRect: Rect = {
          left: fallbackCenter.x - cellWidth * 0.45,
          right: fallbackCenter.x + cellWidth * 0.45,
          top: fallbackCenter.y - cellHeight * 0.45,
          bottom: fallbackCenter.y + cellHeight * 0.45,
        };
        clipped = clipPolygonByRect(sourcePolygon, fallbackRect);
      }
      if (clipped.length < 3) {
        const fallbackPoint = markerPointInPolygonFallback(sourcePolygon, index, districts.length);
        clipped = [
          { x: fallbackPoint.x - 1, y: fallbackPoint.y - 1 },
          { x: fallbackPoint.x + 1, y: fallbackPoint.y - 1 },
          { x: fallbackPoint.x + 1, y: fallbackPoint.y + 1 },
          { x: fallbackPoint.x - 1, y: fallbackPoint.y + 1 },
        ];
      }

      const centroid = polygonCentroid(clipped);
      const targetPoints = clipped.map((point) => toTargetPoint(point.x, point.y));
      const targetCentroid = toTargetPoint(centroid.x, centroid.y);
      const pathData =
        targetPoints.length >= 3
          ? `M ${targetPoints.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`
          : "";

      return {
        district,
        districtId: stableDistrictId(district),
        subRegion: overlay.subRegion,
        subRegionId: stableSubRegionId(overlay.subRegion),
        pathData,
        centroidX: targetCentroid.x,
        centroidY: targetCentroid.y,
      };
    });
  },
).filter((entry) => entry.pathData.length > 0);

const DISTRICT_OVERLAY_MARKERS: UgandaDistrictOverlayMarker[] = DISTRICT_OVERLAY_PATHS.map(
  (entry) => ({
    district: entry.district,
    districtId: entry.districtId,
    subRegion: entry.subRegion,
    subRegionId: entry.subRegionId,
    cx: entry.centroidX,
    cy: entry.centroidY,
  }),
);

export function getDistrictOverlayPaths(subRegion?: UgandaMapSubRegionName) {
  if (!subRegion) {
    return DISTRICT_OVERLAY_PATHS;
  }
  return DISTRICT_OVERLAY_PATHS.filter((entry) => entry.subRegion === subRegion);
}

export function getDistrictOverlayMarkers(subRegion?: UgandaMapSubRegionName) {
  if (!subRegion) {
    return DISTRICT_OVERLAY_MARKERS;
  }
  return DISTRICT_OVERLAY_MARKERS.filter((entry) => entry.subRegion === subRegion);
}
