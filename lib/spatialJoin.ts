/** Haversine spatial join for COP contacts vs events. */

export const FIRMS_NEAR_EVENT_KM = 50;
const EARTH_R_KM = 6371;

export type LatLon = {
  latitude: number;
  longitude: number;
};

export function haversineKm(
  a: LatLon,
  b: LatLon,
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

export type NearbyFirmsHit<T extends LatLon> = T & {
  distanceKm: number;
};

/** FIRMS detections within `radiusKm` of an event (default 50 km). */
export function firmsNearEvent<T extends LatLon>(
  event: LatLon,
  detections: T[],
  radiusKm = FIRMS_NEAR_EVENT_KM,
): NearbyFirmsHit<T>[] {
  if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) {
    return [];
  }
  const hits: NearbyFirmsHit<T>[] = [];
  for (const d of detections) {
    if (!Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) continue;
    const distanceKm = haversineKm(event, d);
    if (distanceKm <= radiusKm) {
      hits.push({ ...d, distanceKm });
    }
  }
  hits.sort((a, b) => a.distanceKm - b.distanceKm);
  return hits;
}
