/**
 * USGS earthquake GeoJSON → contacts (not events).
 * Public M2.5+ detections; delayed, incomplete, not an alert system.
 */

export type QuakeContact = {
  id: string;
  title: string;
  place: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depthKm: number;
  occurredAt: number;
  tsunami: boolean;
  url: string;
};

export const QUAKE_MAX_CONTACTS = 120;

type UsgsFeature = {
  id?: string;
  geometry?: { coordinates?: unknown };
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    title?: string;
    tsunami?: number;
    url?: string;
    type?: string;
  };
};

export function parseUsgsGeojson(
  json: unknown,
  cap = QUAKE_MAX_CONTACTS,
): QuakeContact[] {
  if (!json || typeof json !== "object") return [];
  const features = (json as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const out: QuakeContact[] = [];
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as UsgsFeature;
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const depth = Number(coords[2]);
    const mag = Number(f.properties?.mag);
    const time = Number(f.properties?.time);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    if (!Number.isFinite(mag) || mag < 2.5) continue;
    const idRaw = typeof f.id === "string" && f.id.trim() ? f.id.trim() : "";
    if (!idRaw) continue;
    const place = (f.properties?.place ?? "").trim() || "unknown location";
    out.push({
      id: `quake:${idRaw}`,
      title: (f.properties?.title ?? "").trim() || `M${mag.toFixed(1)} ${place}`,
      place,
      magnitude: mag,
      latitude: lat,
      longitude: lon,
      depthKm: Number.isFinite(depth) ? depth : 0,
      occurredAt: Number.isFinite(time) ? time : 0,
      tsunami: Boolean(f.properties?.tsunami),
      url: typeof f.properties?.url === "string" ? f.properties.url : "",
    });
    if (out.length >= cap) break;
  }
  out.sort((a, b) => b.magnitude - a.magnitude);
  return out;
}
