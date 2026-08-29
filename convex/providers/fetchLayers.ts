/**
 * Fetch NASA FIRMS CSV and CelesTrak GP/OMM into layerSnapshots.
 * Contacts only — never upserted as events.
 */

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  looksLikeInvalidFirmsMapKey,
  parseFirmsCsv,
  resolveFirmsSourceState,
} from "../lib/firms";
import { resolveLayerSourceState, type LayerId } from "../lib/layerState";

const FETCH_TIMEOUT_MS = 8_000;
const FIRMS_PUBLIC_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 5_000_000;
const FIRMS_PUBLIC_MAX_BYTES = 20_000_000;
const USER_AGENT =
  "GlobalSituationMonitor/1.0 (MSWlab.ai prototype; FIRMS/CelesTrak overlay)";
const SAT_CAP = 150;
const FIRMS_PUBLIC_CSV_URL =
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";
const LIVE_TLE_NORADS = [
  25544, // ISS
  20580, // Hubble
  48274, // CSS / Tiangong
  43013, // NOAA-20
  37849, // Suomi NPP
];
const CELESTRAK_URLS = [
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json",
  "https://www.celestrak.com/NORAD/elements/gp.php?GROUP=stations&FORMAT=json",
] as const;

/** CelesTrak-format GP/OMM snapshot used only when live CelesTrak is unreachable. */
const SEEDED_STATIONS_OMM: Array<Record<string, unknown>> = [
  {
    OBJECT_NAME: "ISS (ZARYA)",
    OBJECT_ID: "1998-067A",
    NORAD_CAT_ID: 25544,
    EPOCH: "2024-03-01T12:00:00.000000",
    MEAN_MOTION: 15.498,
    ECCENTRICITY: 0.0005853,
    INCLINATION: 51.6416,
    RA_OF_ASC_NODE: 21.7867,
    ARG_OF_PERICENTER: 85.1234,
    MEAN_ANOMALY: 274.8766,
    BSTAR: 0.0001027,
    MEAN_MOTION_DOT: 0.00016717,
    MEAN_MOTION_DDOT: 0,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 40000,
  },
];

async function fetchRaw(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number; accept?: string },
): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {
  const timeoutMs = opts?.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = opts?.maxBytes ?? MAX_BODY_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: opts?.accept ?? "text/csv, application/json, text/plain, */*",
      },
      redirect: "follow",
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return {
        ok: false,
        status: res.status,
        text: `Response too large (${buf.byteLength})`,
      };
    }
    const text = new TextDecoder().decode(buf);
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function slimCelestrakRow(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = o.OBJECT_NAME;
  const norad = o.NORAD_CAT_ID;
  const epoch = o.EPOCH;
  if (typeof name !== "string" || !name.trim()) return null;
  if (norad === undefined || norad === null) return null;
  if (typeof epoch !== "string" || !epoch.trim()) return null;
  const required = [
    "MEAN_MOTION",
    "ECCENTRICITY",
    "INCLINATION",
    "RA_OF_ASC_NODE",
    "ARG_OF_PERICENTER",
    "MEAN_ANOMALY",
    "BSTAR",
    "MEAN_MOTION_DOT",
    "MEAN_MOTION_DDOT",
  ];
  for (const key of required) {
    if (o[key] === undefined || o[key] === null || o[key] === "") return null;
  }
  return {
    OBJECT_NAME: name.trim(),
    OBJECT_ID: typeof o.OBJECT_ID === "string" ? o.OBJECT_ID : undefined,
    NORAD_CAT_ID: norad,
    EPOCH: epoch,
    MEAN_MOTION: o.MEAN_MOTION,
    ECCENTRICITY: o.ECCENTRICITY,
    INCLINATION: o.INCLINATION,
    RA_OF_ASC_NODE: o.RA_OF_ASC_NODE,
    ARG_OF_PERICENTER: o.ARG_OF_PERICENTER,
    MEAN_ANOMALY: o.MEAN_ANOMALY,
    BSTAR: o.BSTAR,
    MEAN_MOTION_DOT: o.MEAN_MOTION_DOT,
    MEAN_MOTION_DDOT: o.MEAN_MOTION_DDOT,
    ELEMENT_SET_NO: o.ELEMENT_SET_NO ?? 0,
    REV_AT_EPOCH: o.REV_AT_EPOCH,
    EPHEMERIS_TYPE: o.EPHEMERIS_TYPE ?? 0,
    CLASSIFICATION_TYPE: o.CLASSIFICATION_TYPE ?? "U",
  };
}

async function writeFirms(
  ctx: ActionCtx,
  args: {
    now: number;
    status: "LIVE" | "STALE" | "KEY_REQUIRED" | "UNAVAILABLE";
    detections: unknown[];
    errorSummary?: string;
    provenance: string;
  },
) {
  await ctx.runMutation(internal.layers.replaceSnapshot, {
    layer: "firms",
    fetchedAt: args.now,
    status: args.status,
    recordsJson: JSON.stringify(args.detections),
    recordsReceived: args.detections.length,
    errorSummary: args.errorSummary,
    provenance: args.provenance,
  });
}

async function refreshFirms(ctx: ActionCtx) {
  const now = Date.now();
  const publicProvenance =
    "NASA FIRMS Suomi-NPP VIIRS C2 Global 24h CSV (keyless) — public hotspot detections, not events";

  try {
    const res = await fetchRaw(FIRMS_PUBLIC_CSV_URL, {
      timeoutMs: FIRMS_PUBLIC_TIMEOUT_MS,
      maxBytes: FIRMS_PUBLIC_MAX_BYTES,
    });
    if (res.ok) {
      const detections = parseFirmsCsv(res.text);
      if (detections.length > 0) {
        await writeFirms(ctx, {
          now,
          status: "LIVE",
          detections,
          provenance: publicProvenance,
        });
        return;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "fetch failed";
    // Fall through to MAP_KEY API / KEY_REQUIRED.
    void message;
  }

  const mapKey = (process.env.FIRMS_MAP_KEY ?? "").trim();
  const keyedProvenance =
    "NASA FIRMS VIIRS_SNPP_NRT world/1 — public hotspot detections, not events";

  if (!mapKey) {
    await writeFirms(ctx, {
      now,
      status: "KEY_REQUIRED",
      detections: [],
      errorSummary:
        "Public FIRMS 24h CSV unavailable and FIRMS_MAP_KEY not configured",
      provenance: keyedProvenance,
    });
    return;
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/world/1`;
  try {
    const res = await fetchRaw(url);
    const invalid = looksLikeInvalidFirmsMapKey(res.status, res.text);
    if (invalid || !res.ok) {
      const status = resolveFirmsSourceState({
        mapKey,
        now,
        httpStatus: res.status,
        bodyPreview: res.text.slice(0, 400),
        fetchFailed: !res.ok,
      });
      await writeFirms(ctx, {
        now,
        status,
        detections: [],
        errorSummary: invalid
          ? "Invalid FIRMS_MAP_KEY"
          : `FIRMS HTTP ${res.status}`,
        provenance: keyedProvenance,
      });
      return;
    }
    const detections = parseFirmsCsv(res.text);
    await writeFirms(ctx, {
      now,
      status: "LIVE",
      detections,
      provenance: keyedProvenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await writeFirms(ctx, {
      now,
      status: "UNAVAILABLE",
      detections: [],
      errorSummary: message,
      provenance: keyedProvenance,
    });
  }
}

function tleRecordFromApi(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const line1 = typeof o.line1 === "string" ? o.line1 : "";
  const line2 = typeof o.line2 === "string" ? o.line2 : "";
  const name = typeof o.name === "string" ? o.name : "";
  const norad = o.satelliteId ?? o.NORAD_CAT_ID;
  if (!line1.startsWith("1 ") || !line2.startsWith("2 ") || !name || norad == null) {
    return null;
  }
  return {
    OBJECT_NAME: name.trim(),
    NORAD_CAT_ID: norad,
    EPOCH: typeof o.date === "string" ? o.date : undefined,
    TLE_LINE1: line1.trim(),
    TLE_LINE2: line2.trim(),
  };
}

async function refreshSatellites(ctx: ActionCtx) {
  const now = Date.now();
  const tleProvenance =
    "Live TLE (tle.ivanstanojevic.me) · SGP4 at display time — orbital elements, not illustrative tracks";
  const liveProvenance =
    "CelesTrak GP JSON (OMM) · SGP4-propagated at display time — orbital elements, not illustrative tracks";
  const byNorad = new Map<string, Record<string, unknown>>();
  const errors: string[] = [];

  for (const norad of LIVE_TLE_NORADS) {
    const url = `https://tle.ivanstanojevic.me/api/tle/${norad}`;
    try {
      const res = await fetchRaw(url, { accept: "application/json" });
      if (!res.ok) {
        errors.push(`tle ${norad}: HTTP ${res.status}`);
        continue;
      }
      const rec = tleRecordFromApi(JSON.parse(res.text) as unknown);
      if (!rec) {
        errors.push(`tle ${norad}: malformed`);
        continue;
      }
      byNorad.set(String(rec.NORAD_CAT_ID), rec);
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 120) : "error";
      errors.push(`tle ${norad}: ${message}`);
    }
  }

  if (byNorad.size > 0) {
    const records = [...byNorad.values()];
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "satellites",
      fetchedAt: now,
      status: "LIVE",
      recordsJson: JSON.stringify(records),
      recordsReceived: records.length,
      errorSummary: errors.length ? errors.join("; ").slice(0, 400) : undefined,
      provenance: tleProvenance,
    });
    return;
  }

  for (const url of CELESTRAK_URLS) {
    try {
      const res = await fetchRaw(url);
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      const parsed = JSON.parse(res.text) as unknown;
      if (!Array.isArray(parsed)) {
        errors.push(`${url}: not a JSON array`);
        continue;
      }
      for (const row of parsed) {
        const slim = slimCelestrakRow(row);
        if (!slim) continue;
        byNorad.set(String(slim.NORAD_CAT_ID), slim);
        if (byNorad.size >= SAT_CAP) break;
      }
      if (byNorad.size > 0) break;
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 200) : "error";
      errors.push(`${url}: ${message}`);
    }
  }

  let records = [...byNorad.values()].slice(0, SAT_CAP);
  let provenance = liveProvenance;
  if (records.length === 0) {
    records = SEEDED_STATIONS_OMM.map((row) => slimCelestrakRow(row)).filter(
      (row): row is Record<string, unknown> => row != null,
    );
    provenance =
      "CelesTrak-format GP/OMM bundled snapshot · SGP4 at display time — live CelesTrak unreachable, not an illustrative track";
  }

  const usedSeed = provenance !== liveProvenance;
  const status = usedSeed
    ? "STALE"
    : resolveLayerSourceState({
        layer: "satellites",
        now,
        fetchedAt: now,
        fetchFailed: false,
      });

  await ctx.runMutation(internal.layers.replaceSnapshot, {
    layer: "satellites",
    fetchedAt: now,
    status,
    recordsJson: JSON.stringify(records),
    recordsReceived: records.length,
    errorSummary: errors.length ? errors.join("; ").slice(0, 400) : undefined,
    provenance,
  });
}

export const refresh = internalAction({
  args: {
    layer: v.union(
      v.literal("firms"),
      v.literal("satellites"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, args) => {
    const layers: LayerId[] =
      args.layer === "all" ? ["firms", "satellites"] : [args.layer];
    for (const layer of layers) {
      if (layer === "firms") await refreshFirms(ctx);
      else await refreshSatellites(ctx);
    }
    return { ok: true, layer: args.layer };
  },
});
