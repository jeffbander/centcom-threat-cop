/**
 * Heuristic signal scoring for OSINT-style X posts.
 * Not a classifier claim of truth — ranks attention for the tailored feed.
 */

import { geocodeFromText } from "./geo";

const HIGH =
  /\b(missile|airstrike|artillery|drone|uav|fpv|explosion|invasion|offensive|battalion|brigade|mech|armor|tank|warship|naval|strike|bombard|casualt|kill|captured|encircled|breakthrough|nuclear|irbm|icbm|ballistic)\b/i;
const MED =
  /\b(troops|forces|military|conflict|frontline|front line|shelling|rocket|sam|air defense|convoy|mobiliz|deployment|exercise|sanction|ceasefire|hostage|intel|osint|geolocat)\b/i;
const THEATER =
  /\b(ukraine|russia|gaza|israel|iran|lebanon|yemen|taiwan|korea|sudan|sahel|syria|iraq|red sea|hormuz|donetsk|kharkiv|crimea|hezbollah|houthi)\b/i;

export function scoreXPost(text: string): number {
  let score = 10;
  if (HIGH.test(text)) score += 45;
  if (MED.test(text)) score += 25;
  if (THEATER.test(text)) score += 15;
  // Media-ish density (links / cashtags less relevant)
  if (/https?:\/\//i.test(text)) score += 5;
  if (text.length > 180) score += 5;
  return Math.min(100, score);
}

export function inferGeoFromPost(text: string): {
  region?: string;
  lat?: number;
  lon?: number;
} {
  const g = geocodeFromText(text);
  if (!g) return {};
  return { region: g.region, lat: g.latitude, lon: g.longitude };
}

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

export function isValidHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

/** Default seed list — public OSINT-style accounts (user can edit). */
export const DEFAULT_X_OSINT_ACCOUNTS: Array<{
  handle: string;
  feedChannel: string;
  tags: string[];
  displayName?: string;
}> = [
  // Primary user-specified OSINT wire
  {
    handle: "sentdefender",
    feedChannel: "breaking",
    tags: ["osint", "defense", "breaking", "military"],
    displayName: "Sent Defender",
  },
  {
    handle: "osinttechnical",
    feedChannel: "global",
    tags: ["osint", "military"],
    displayName: "OSINTtechnical",
  },
  {
    handle: "intelcrab",
    feedChannel: "global",
    tags: ["osint", "conflict"],
    displayName: "IntelCrab",
  },
  {
    handle: "osintwarfare",
    feedChannel: "global",
    tags: ["osint", "warfare"],
    displayName: "OSINT Warfare",
  },
  {
    handle: "ukraine_map",
    feedChannel: "ukraine",
    tags: ["ukraine", "map"],
    displayName: "Ukraine Map",
  },
  {
    handle: "clashreport",
    feedChannel: "global",
    tags: ["conflict", "breaking"],
    displayName: "Clash Report",
  },
  {
    handle: "noelreports",
    feedChannel: "europe",
    tags: ["europe", "osint"],
    displayName: "NOELreports",
  },
  {
    handle: "rybar_force",
    feedChannel: "ukraine",
    tags: ["ukraine", "military"],
    displayName: "Rybar",
  },
];
