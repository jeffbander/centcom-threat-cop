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
