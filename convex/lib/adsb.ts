/**
 * adsb.lol military/civil aircraft contacts. Not events. Not targeting data.
 * Positions are public ADS-B; delayed, incomplete, unlabeled as intel.
 */

export type AdsbContact = {
  id: string;
  hex: string;
  callsign: string;
  registration: string;
  typeCode: string;
  latitude: number;
  longitude: number;
  altitudeFt: number | null;
  groundSpeedKt: number | null;
  trackDeg: number | null;
  military: boolean;
};

export const ADSB_MAX_CONTACTS = 200;

type AdsbAc = {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  dbFlags?: number;
};

export function parseAdsbLol(json: unknown, cap = ADSB_MAX_CONTACTS): AdsbContact[] {
  if (!json || typeof json !== "object") return [];
  const ac = (json as { ac?: unknown }).ac;
  if (!Array.isArray(ac)) return [];
  const out: AdsbContact[] = [];
  for (const row of ac) {
    if (!row || typeof row !== "object") continue;
    const a = row as AdsbAc;
    const hex = typeof a.hex === "string" ? a.hex.trim().toLowerCase() : "";
    const lat = Number(a.lat);
    const lon = Number(a.lon);
    if (!hex || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const altRaw = a.alt_baro;
    const altitudeFt =
      typeof altRaw === "number" && Number.isFinite(altRaw)
        ? altRaw
        : null;
    const gs = Number(a.gs);
    const track = Number(a.track);
    const callsign = (a.flight ?? "").trim() || hex.toUpperCase();
    out.push({
      id: `adsb:${hex}`,
      hex,
      callsign,
      registration: (a.r ?? "").trim(),
      typeCode: (a.t ?? "").trim(),
      latitude: lat,
      longitude: lon,
      altitudeFt,
      groundSpeedKt: Number.isFinite(gs) ? gs : null,
      trackDeg: Number.isFinite(track) ? track : null,
      military: Boolean(a.dbFlags && a.dbFlags & 1),
    });
    if (out.length >= cap) break;
  }
  return out;
}
