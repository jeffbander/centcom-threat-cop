import { THEATER_AOIS, type TheaterAOI } from "./showOverlays";

export type TheaterMission = {
  id: string;
  name: string;
  status: TheaterAOI["status"];
  color: string;
  latitude: number;
  longitude: number;
  zoom: number;
};

function centroid(polygon: Array<[number, number]>): {
  latitude: number;
  longitude: number;
} {
  let lat = 0;
  let lon = 0;
  for (const [la, lo] of polygon) {
    lat += la;
    lon += lo;
  }
  const n = polygon.length || 1;
  return { latitude: lat / n, longitude: lon / n };
}

export const THEATER_MISSIONS: TheaterMission[] = THEATER_AOIS.map((ao) => {
  const c = centroid(ao.polygon);
  return {
    id: ao.id,
    name: ao.name.replace(/^AO\s+/, ""),
    status: ao.status,
    color: ao.color,
    latitude: c.latitude,
    longitude: c.longitude,
    zoom: 5,
  };
});

export type ThreatCondition = {
  code: "TC-RED" | "TC-ORANGE" | "TC-YELLOW" | "TC-GREEN";
  label: string;
};

/** Ukraine AOR box from the theater AOI (not a legal boundary). */
export const UKRAINE_AOR = {
  minLat: 44,
  maxLat: 52.5,
  minLon: 22,
  maxLon: 40.5,
} as const;

export function inUkraineAor(lat: number, lon: number): boolean {
  return (
    lat >= UKRAINE_AOR.minLat &&
    lat <= UKRAINE_AOR.maxLat &&
    lon >= UKRAINE_AOR.minLon &&
    lon <= UKRAINE_AOR.maxLon
  );
}

export function looksUkraineRelated(text: string): boolean {
  return /ukraine|ukrainian|kyiv|kiev|kharkiv|donetsk|luhansk|zaporizh|kherson|odes[sa]|crimea|black sea|kursk|belgorod|mariupol|sumy|dnipro/i.test(
    text,
  );
}

export const MIDDLE_EAST_AOR = {
  minLat: 12,
  maxLat: 38,
  minLon: 32,
  maxLon: 64,
} as const;

export function inMiddleEastAor(lat: number, lon: number): boolean {
  return (
    lat >= MIDDLE_EAST_AOR.minLat &&
    lat <= MIDDLE_EAST_AOR.maxLat &&
    lon >= MIDDLE_EAST_AOR.minLon &&
    lon <= MIDDLE_EAST_AOR.maxLon
  );
}

export function looksMiddleEastRelated(text: string): boolean {
  return /iran|iraq|syria|yemen|gaza|israel|lebanon|hormuz|houthi|hezbollah|red sea|baghdad|tehran|damascus|beirut|sana.?a|west bank|palestine|idf|irgc/i.test(
    text,
  );
}

export function threatCondition(
  criticalCount: number,
  highCount: number,
): ThreatCondition {
  if (criticalCount >= 3) {
    return { code: "TC-RED", label: "multiple critical" };
  }
  if (criticalCount >= 1 || highCount >= 8) {
    return { code: "TC-ORANGE", label: "elevated critical/high" };
  }
  if (highCount >= 1) {
    return { code: "TC-YELLOW", label: "high-severity watch" };
  }
  return { code: "TC-GREEN", label: "routine watch" };
}
