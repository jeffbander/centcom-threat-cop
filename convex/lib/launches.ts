/**
 * Launch Library 2 upcoming launches → pad contacts (not events).
 * Public The Space Devs API. Times slip; not a range safety feed.
 */

export type LaunchContact = {
  id: string;
  name: string;
  provider: string;
  rocket: string;
  pad: string;
  location: string;
  netAt: number;
  status: string;
  latitude: number;
  longitude: number;
};

export const LAUNCH_MAX_CONTACTS = 24;

type LlLaunch = {
  id?: string;
  name?: string;
  net?: string;
  status?: { abbrev?: string; name?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { name?: string; full_name?: string } };
  pad?: {
    name?: string;
    latitude?: string | number;
    longitude?: string | number;
    location?: { name?: string };
  };
};

export function parseLaunchLibrary(
  json: unknown,
  cap = LAUNCH_MAX_CONTACTS,
): LaunchContact[] {
  if (!json || typeof json !== "object") return [];
  const results = (json as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: LaunchContact[] = [];
  for (const raw of results) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as LlLaunch;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const pad = r.pad;
    const lat = Number(pad?.latitude);
    const lon = Number(pad?.longitude);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const netAt = r.net ? Date.parse(r.net) : NaN;
    if (!Number.isFinite(netAt)) continue;
    const rocket =
      r.rocket?.configuration?.full_name ||
      r.rocket?.configuration?.name ||
      "rocket";
    out.push({
      id: `launch:${id}`,
      name: (r.name ?? "").trim() || rocket,
      provider: (r.launch_service_provider?.name ?? "").trim() || "—",
      rocket,
      pad: (pad?.name ?? "").trim() || "pad",
      location: (pad?.location?.name ?? "").trim() || "—",
      netAt,
      status: (r.status?.abbrev ?? r.status?.name ?? "TBD").trim(),
      latitude: lat,
      longitude: lon,
    });
    if (out.length >= cap) break;
  }
  out.sort((a, b) => a.netAt - b.netAt);
  return out;
}
