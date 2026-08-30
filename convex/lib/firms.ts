/**
 * NASA FIRMS CSV → hotspot detections (contacts, not events).
 * Public domain fire detections. Incomplete, delayed, and unlabeled as intel.
 */

import {
  resolveLayerSourceState,
  type LayerSourceState,
} from "./layerState";
import { inMiddleEastAor, inUkraineAor } from "./geo";

export type FirmsDetection = {
  id: string;
  latitude: number;
  longitude: number;
  frp: number;
  acquiredAt: number;
  satellite: string;
  instrument: string;
  confidence: string;
  brightness: number | null;
  daynight: string | null;
};

export const FIRMS_MAX_DETECTIONS = 400;
export const FIRMS_UKRAINE_RESERVE = 180;

const HEADER_ALIASES: Record<string, string> = {
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lon: "longitude",
  long: "longitude",
  frp: "frp",
  acq_date: "acq_date",
  acq_time: "acq_time",
  satellite: "satellite",
  instrument: "instrument",
  confidence: "confidence",
  bright_ti4: "brightness",
  brightness: "brightness",
  bright_t31: "brightness",
  daynight: "daynight",
};

export function looksLikeInvalidFirmsMapKey(
  httpStatus: number | null | undefined,
  body: string,
): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const head = body.slice(0, 400).toLowerCase();
  return (
    /invalid\s+map[_\s-]?key/.test(head) ||
    /map[_\s-]?key.{0,40}(not\s+valid|unauthorized|not authorized)/.test(head)
  );
}

export function resolveFirmsSourceState(input: {
  mapKey: string | undefined | null;
  now: number;
  fetchedAt?: number | null;
  httpStatus?: number | null;
  bodyPreview?: string | null;
  fetchFailed?: boolean;
}): LayerSourceState {
  const key = (input.mapKey ?? "").trim();
  const body = input.bodyPreview ?? "";
  const keyInvalid =
    key.length > 0 && looksLikeInvalidFirmsMapKey(input.httpStatus, body);
  return resolveLayerSourceState({
    layer: "firms",
    now: input.now,
    fetchedAt: input.fetchedAt ?? null,
    keyPresent: key.length > 0,
    keyInvalid,
    fetchFailed: input.fetchFailed === true && !keyInvalid && key.length > 0,
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function normalizeHeader(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function parseAcquiredAt(acqDate: string, acqTime: string): number | null {
  const date = acqDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const digits = acqTime.trim().replace(/\D/g, "").padStart(4, "0").slice(0, 4);
  if (!/^\d{4}$/.test(digits)) return null;
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const ms = Date.parse(`${date}T${hh}:${mm}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function firmsDetectionId(d: {
  latitude: number;
  longitude: number;
  acquiredAt: number;
  satellite: string;
}): string {
  return `firms:${d.acquiredAt}:${d.latitude.toFixed(4)}:${d.longitude.toFixed(4)}:${d.satellite}`;
}

/**
 * Parse a NASA FIRMS area CSV. Returns detections sorted by FRP desc, capped.
 * Throws only on totally unusable input (not CSV). Empty valid CSV → [].
 */
function pushCapped(list: FirmsDetection[], det: FirmsDetection, cap: number) {
  if (list.length < cap) {
    list.push(det);
    return;
  }
  let minI = 0;
  for (let i = 1; i < list.length; i++) {
    const a = list[i];
    const b = list[minI];
    if (a.frp < b.frp || (a.frp === b.frp && a.acquiredAt < b.acquiredAt)) {
      minI = i;
    }
  }
  const weakest = list[minI];
  if (
    det.frp > weakest.frp ||
    (det.frp === weakest.frp && det.acquiredAt > weakest.acquiredAt)
  ) {
    list[minI] = det;
  }
}

export function parseFirmsCsv(
  csv: string,
  cap = FIRMS_MAX_DETECTIONS,
  reserveCap = FIRMS_UKRAINE_RESERVE,
): FirmsDetection[] {
  const text = csv.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx: Partial<Record<string, number>> = {};
  headerCells.forEach((cell, i) => {
    const canonical = HEADER_ALIASES[cell];
    if (canonical && idx[canonical] === undefined) idx[canonical] = i;
  });

  if (idx.latitude === undefined || idx.longitude === undefined) {
    throw new Error("FIRMS CSV missing latitude/longitude columns");
  }

  const detections: FirmsDetection[] = [];
  const reserved: FirmsDetection[] = [];
  const consider = (det: FirmsDetection) => {
    if (
      reserveCap > 0 &&
      (inUkraineAor(det.latitude, det.longitude) ||
        inMiddleEastAor(det.latitude, det.longitude))
    ) {
      pushCapped(reserved, det, reserveCap);
    }
    pushCapped(detections, det, cap);
  };

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const lat = Number(cells[idx.latitude]);
    const lon = Number(cells[idx.longitude]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const frpRaw = idx.frp !== undefined ? Number(cells[idx.frp]) : NaN;
    const frp = Number.isFinite(frpRaw) ? frpRaw : 0;
    const acqDate = idx.acq_date !== undefined ? cells[idx.acq_date] ?? "" : "";
    const acqTime = idx.acq_time !== undefined ? cells[idx.acq_time] ?? "" : "";
    const acquiredAt = parseAcquiredAt(acqDate, acqTime);
    if (acquiredAt == null) continue;

    const satellite = (idx.satellite !== undefined ? cells[idx.satellite] : "")
      .trim() || "unknown";
    const instrument = (idx.instrument !== undefined ? cells[idx.instrument] : "")
      .trim() || "VIIRS";
    const confidence = (idx.confidence !== undefined ? cells[idx.confidence] : "")
      .trim() || "";
    const brightnessRaw =
      idx.brightness !== undefined ? Number(cells[idx.brightness]) : NaN;
    const daynight =
      idx.daynight !== undefined ? cells[idx.daynight]?.trim() || null : null;

    const row = {
      latitude: lat,
      longitude: lon,
      frp,
      acquiredAt,
      satellite,
      instrument,
      confidence,
      brightness: Number.isFinite(brightnessRaw) ? brightnessRaw : null,
      daynight,
    };
    consider({
      id: firmsDetectionId(row),
      ...row,
    });
  }

  reserved.sort((a, b) => b.frp - a.frp || b.acquiredAt - a.acquiredAt);
  detections.sort((a, b) => b.frp - a.frp || b.acquiredAt - a.acquiredAt);
  const seen = new Set(reserved.map((d) => d.id));
  const out = [...reserved];
  for (const d of detections) {
    if (out.length >= cap) break;
    if (seen.has(d.id)) continue;
    out.push(d);
    seen.add(d.id);
  }
  return out;
}
