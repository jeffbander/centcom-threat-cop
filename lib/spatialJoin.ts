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

/** Destination point after traveling `km` along `bearingDeg` from origin. */
export function destinationPoint(
  from: LatLon,
  bearingDegValue: number,
  km: number,
): LatLon {
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  const δ = km / EARTH_R_KM;
  const θ = bearingDegValue * d2r;
  const φ1 = from.latitude * d2r;
  const λ1 = from.longitude * d2r;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const φ2 = Math.asin(sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return {
    latitude: φ2 * r2d,
    longitude: ((λ2 * r2d + 540) % 360) - 180,
  };
}

/** Initial bearing from A to B in degrees [0, 360). */
export function bearingDeg(from: LatLon, to: LatLon): number {
  const d2r = Math.PI / 180;
  const φ1 = from.latitude * d2r;
  const φ2 = to.latitude * d2r;
  const Δλ = (to.longitude - from.longitude) * d2r;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

export function nearbyWithin<T extends LatLon>(
  origin: LatLon,
  items: T[],
  radiusKm: number,
): NearbyFirmsHit<T>[] {
  return firmsNearEvent(origin, items, radiusKm);
}

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
