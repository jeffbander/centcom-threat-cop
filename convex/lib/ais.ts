/**
 * Open Waters AIS GeoJSON → vessel contacts (not events, not targeting).
 * Coverage is uneven volunteer/government AIS; delayed and incomplete.
 */

export type AisContact = {
  id: string;
  mmsi: string;
  name: string;
  shipType: number | null;
  shipTypeLabel: string;
  latitude: number;
  longitude: number;
  sogKt: number | null;
  cogDeg: number | null;
  headingDeg: number | null;
  navStatus: number | null;
};

export const AIS_MAX_CONTACTS = 220;

/** minLat,minLon,maxLat,maxLon — theater sea boxes, not official boundaries. */
export const AIS_THEATER_BBOXES: Array<{ id: string; bbox: string }> = [
  { id: "gulf", bbox: "23.5,47,30.5,58" },
  { id: "redsea", bbox: "11,32.5,28,44.5" },
  { id: "taiwan", bbox: "22,117.5,27.5,123.5" },
  { id: "levant", bbox: "31.2,32.2,34.6,35.6" },
  { id: "blacksea", bbox: "41.2,28.5,46.8,41.8" },
];

export function aisShipTypeLabel(type: number | null): string {
  if (type == null || !Number.isFinite(type)) return "vessel";
  if (type === 35) return "military";
  if (type >= 80 && type <= 89) return "tanker";
  if (type >= 70 && type <= 79) return "cargo";
  if (type >= 60 && type <= 69) return "passenger";
  if (type === 30) return "fishing";
  if (type === 52 || type === 31) return "tug";
  if (type >= 40 && type <= 49) return "high-speed";
  return "vessel";
}

function aisRank(c: AisContact): number {
  let score = 0;
  if (c.shipTypeLabel === "military") score += 400;
  if (c.shipTypeLabel === "tanker") score += 200;
  if (c.shipTypeLabel === "cargo") score += 80;
  if ((c.sogKt ?? 0) > 2) score += Math.min(60, (c.sogKt ?? 0) * 2);
  if (c.name && c.name !== c.mmsi) score += 10;
  return score;
}

type AisFeature = {
  id?: number | string;
  geometry?: { coordinates?: unknown };
  properties?: {
    mmsi?: number | string;
    name?: string;
    type?: number | string;
    sog?: number;
    cog?: number;
    heading?: number;
    nav_status?: number;
  };
};

export function parseOpenWatersVessels(
  json: unknown,
  cap = AIS_MAX_CONTACTS,
): AisContact[] {
  if (!json || typeof json !== "object") return [];
  const features = (json as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const byMmsi = new Map<string, AisContact>();
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as AisFeature;
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const mmsi = String(f.properties?.mmsi ?? f.id ?? "").trim();
    if (!/^\d{6,9}$/.test(mmsi)) continue;
    const typeNum = Number(f.properties?.type);
    const shipType = Number.isFinite(typeNum) ? typeNum : null;
    const sog = Number(f.properties?.sog);
    const cog = Number(f.properties?.cog);
    const hdg = Number(f.properties?.heading);
    const nav = Number(f.properties?.nav_status);
    const name = (f.properties?.name ?? "").trim() || mmsi;
    byMmsi.set(mmsi, {
      id: `ais:${mmsi}`,
      mmsi,
      name,
      shipType,
      shipTypeLabel: aisShipTypeLabel(shipType),
      latitude: lat,
      longitude: lon,
      sogKt: Number.isFinite(sog) ? sog : null,
      cogDeg: Number.isFinite(cog) ? cog : null,
      headingDeg: Number.isFinite(hdg) && hdg >= 0 && hdg < 360 ? hdg : null,
      navStatus: Number.isFinite(nav) ? nav : null,
    });
  }
  return rankAndCap([...byMmsi.values()], cap);
}

export function mergeAisContacts(
  batches: AisContact[][],
  cap = AIS_MAX_CONTACTS,
): AisContact[] {
  const byMmsi = new Map<string, AisContact>();
  for (const batch of batches) {
    for (const c of batch) byMmsi.set(c.mmsi, c);
  }
  return rankAndCap([...byMmsi.values()], cap);
}

function rankAndCap(rows: AisContact[], cap: number): AisContact[] {
  return rows.sort((a, b) => aisRank(b) - aisRank(a)).slice(0, cap);
}
