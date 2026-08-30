/**
 * ACLED conflict events → contacts. Requires myACLED OAuth (Research+).
 * Events are coded political violence, lagged, and not targeting data.
 */

export type AcledContact = {
  id: string;
  eventId: string;
  eventDate: string;
  eventType: string;
  subEventType: string;
  actor1: string;
  actor2: string;
  location: string;
  admin1: string;
  fatalities: number;
  notes: string;
  latitude: number;
  longitude: number;
  occurredAt: number;
};

export const ACLED_MAX_CONTACTS = 400;

/** CENTCOM-relevant countries. API uses country=X:OR:country=Y. */
export const ACLED_COUNTRIES = [
  "Iraq",
  "Syria",
  "Yemen",
  "Israel",
  "Palestine",
  "Lebanon",
  "Iran",
  "Saudi Arabia",
  "Jordan",
  "Egypt",
  "Ukraine",
] as const;

export function acledCountryQuery(): string {
  return ACLED_COUNTRIES.map((c) => `country=${encodeURIComponent(c)}`).join(
    ":OR:",
  );
}

type AcledRow = {
  event_id_cnty?: string;
  event_date?: string;
  event_type?: string;
  sub_event_type?: string;
  actor1?: string;
  actor2?: string;
  location?: string;
  admin1?: string;
  fatalities?: number | string;
  notes?: string;
  latitude?: number | string;
  longitude?: number | string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseAcledPayload(
  json: unknown,
  cap = ACLED_MAX_CONTACTS,
): AcledContact[] {
  let rows: unknown[] = [];
  if (Array.isArray(json)) rows = json;
  else if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) rows = data;
  }
  const out: AcledContact[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as AcledRow;
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const eventId = str(r.event_id_cnty);
    if (!eventId) continue;
    const eventDate = str(r.event_date);
    const occurredAt = eventDate ? Date.parse(`${eventDate}T12:00:00Z`) : NaN;
    if (!Number.isFinite(occurredAt)) continue;
    const fatalities = Number(r.fatalities);
    out.push({
      id: `acled:${eventId}`,
      eventId,
      eventDate,
      eventType: str(r.event_type) || "event",
      subEventType: str(r.sub_event_type),
      actor1: str(r.actor1),
      actor2: str(r.actor2),
      location: str(r.location),
      admin1: str(r.admin1),
      fatalities: Number.isFinite(fatalities) ? fatalities : 0,
      notes: str(r.notes).slice(0, 280),
      latitude: lat,
      longitude: lon,
      occurredAt,
    });
    if (out.length >= cap) break;
  }
  out.sort((a, b) => b.occurredAt - a.occurredAt || b.fatalities - a.fatalities);
  return out;
}

export function acledTone(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes("battle")) return "#ef4444";
  if (t.includes("explosion") || t.includes("remote")) return "#f97316";
  if (t.includes("violence") || t.includes("civilian")) return "#fb7185";
  if (t.includes("riot") || t.includes("protest")) return "#eab308";
  return "#f59e0b";
}
