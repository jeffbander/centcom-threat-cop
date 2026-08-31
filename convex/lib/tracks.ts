/** 24h contact tracks and public webcam lookup. Not targeting. */

export type TrackPoint = {
  t: number;
  latitude: number;
  longitude: number;
};

export type PublicCam = {
  id: string;
  name: string;
  operator: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  pageUrl: string;
  stillUrl: string | null;
  note: string;
};

export const TRACK_MAX_POINTS = 220;
export const TRACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EARTH_R_KM = 6371;

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const d2r = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * d2r;
  const dLon = (b.longitude - a.longitude) * d2r;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.latitude * d2r) * Math.cos(b.latitude * d2r) * sinLon * sinLon;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pruneTrack(points: TrackPoint[], now: number): TrackPoint[] {
  const cutoff = now - TRACK_MAX_AGE_MS;
  const kept = points.filter(
    (p) =>
      Number.isFinite(p.t) &&
      p.t >= cutoff &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude),
  );
  if (kept.length <= TRACK_MAX_POINTS) return kept;
  const step = kept.length / TRACK_MAX_POINTS;
  const out: TrackPoint[] = [];
  for (let i = 0; i < TRACK_MAX_POINTS; i++) {
    out.push(kept[Math.min(kept.length - 1, Math.floor(i * step))]);
  }
  const last = kept[kept.length - 1];
  if (out[out.length - 1] !== last) out[out.length - 1] = last;
  return out;
}

export function appendPoint(
  points: TrackPoint[],
  next: TrackPoint,
  minMoveKm = 0.2,
): TrackPoint[] {
  const last = points[points.length - 1];
  if (
    last &&
    haversineKm(last, next) < minMoveKm &&
    Math.abs(next.t - last.t) < 90_000
  ) {
    return points;
  }
  return pruneTrack([...points, next], next.t);
}

export function parseOpenSkyTrack(json: unknown, now = Date.now()): TrackPoint[] {
  if (!json || typeof json !== "object") return [];
  const path = (json as { path?: unknown }).path;
  if (!Array.isArray(path)) return [];
  const cutoff = now - TRACK_MAX_AGE_MS;
  const out: TrackPoint[] = [];
  for (const row of path) {
    if (!Array.isArray(row) || row.length < 3) continue;
    let t = Number(row[0]);
    if (!Number.isFinite(t)) continue;
    if (t < 1e12) t *= 1000;
    const latitude = Number(row[1]);
    const longitude = Number(row[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    if (t < cutoff) continue;
    out.push({ t, latitude, longitude });
  }
  return pruneTrack(out, now);
}

export function mergeTracks(
  a: TrackPoint[],
  b: TrackPoint[],
  now = Date.now(),
): TrackPoint[] {
  const byT = new Map<number, TrackPoint>();
  for (const p of [...a, ...b]) {
    const key = Math.round(p.t / 1000);
    if (!byT.has(key)) byT.set(key, p);
  }
  return pruneTrack(
    [...byT.values()].sort((x, y) => x.t - y.t),
    now,
  );
}

function camUrl(tags: Record<string, string>): {
  pageUrl: string;
  stillUrl: string | null;
} {
  const page =
    tags["webcam:url"] ||
    tags.webcam ||
    tags.url ||
    tags.website ||
    tags["contact:webcam"] ||
    "";
  const still =
    tags.image ||
    (/\.(jpe?g|png|gif|mjpg|mjpeg)(\?|$)/i.test(page) ? page : null);
  return {
    pageUrl: /^https:\/\//i.test(page) ? page : "",
    stillUrl: still && /^https:\/\//i.test(still) ? still : null,
  };
}

export function parseOverpassWebcams(
  json: unknown,
  origin: { latitude: number; longitude: number },
  radiusKm = 50,
): PublicCam[] {
  if (!json || typeof json !== "object") return [];
  const elements = (json as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];
  const out: PublicCam[] = [];
  for (const raw of elements) {
    if (!raw || typeof raw !== "object") continue;
    const el = raw as {
      id?: number;
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string>;
    };
    const latitude = Number(el.lat ?? el.center?.lat);
    const longitude = Number(el.lon ?? el.center?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const tags = el.tags ?? {};
    const urls = camUrl(tags);
    if (!urls.pageUrl && !urls.stillUrl) continue;
    const distanceKm = haversineKm(origin, { latitude, longitude });
    if (distanceKm > radiusKm) continue;
    const name = tags.name || tags["name:en"] || "Public webcam";
    out.push({
      id: `osm:${el.id ?? `${latitude},${longitude}`}`,
      name,
      operator: tags.operator || tags.network || "OpenStreetMap webcam",
      latitude,
      longitude,
      distanceKm,
      pageUrl: urls.pageUrl || urls.stillUrl || "",
      stillUrl: urls.stillUrl,
      note: "OSM tourism=webcam · public listing, not a CCTV tap",
    });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out.slice(0, 8);
}
