import { haversineKm } from "./spatialJoin";

export type NearbyContact<T extends { id: string; latitude: number; longitude: number }> = {
  contact: T;
  distanceKm: number;
};

export function buildNearbyRoster<
  T extends { id: string; latitude: number; longitude: number },
>(
  origin: { latitude: number; longitude: number } | null,
  contacts: T[],
  radiusKm = 250,
): NearbyContact<T>[] {
  if (!origin) return [];
  return contacts
    .map((c) => ({
      contact: c,
      distanceKm: haversineKm(origin, c),
    }))
    .filter((n) => n.distanceKm <= radiusKm && n.distanceKm > 0.05)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 16);
}
