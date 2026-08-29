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

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 5_000_000;
const USER_AGENT =
  "GlobalSituationMonitor/1.0 (MSWlab.ai prototype; FIRMS/CelesTrak overlay)";
const SAT_CAP = 150;
const CELESTRAK_GROUPS = ["stations", "weather"] as const;

async function fetchRaw(url: string): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/csv, application/json, text/plain, */*",
      },
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
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

async function refreshFirms(ctx: ActionCtx) {
  const now = Date.now();
  const mapKey = (process.env.FIRMS_MAP_KEY ?? "").trim();
  const provenance =
    "NASA FIRMS VIIRS_SNPP_NRT world/1 — public hotspot detections, not events";

  if (!mapKey) {
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "firms",
      fetchedAt: now,
      status: "KEY_REQUIRED",
      recordsJson: "[]",
      recordsReceived: 0,
      errorSummary: "FIRMS_MAP_KEY not configured on Convex",
      provenance,
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
      await ctx.runMutation(internal.layers.replaceSnapshot, {
        layer: "firms",
        fetchedAt: now,
        status,
        recordsJson: "[]",
        recordsReceived: 0,
        errorSummary: invalid
          ? "Invalid FIRMS_MAP_KEY"
          : `FIRMS HTTP ${res.status}`,
        provenance,
      });
      return;
    }
    const detections = parseFirmsCsv(res.text);
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "firms",
      fetchedAt: now,
      status: "LIVE",
      recordsJson: JSON.stringify(detections),
      recordsReceived: detections.length,
      provenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "firms",
      fetchedAt: now,
      status: "UNAVAILABLE",
      recordsJson: "[]",
      recordsReceived: 0,
      errorSummary: message,
      provenance,
    });
  }
}

async function refreshSatellites(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "CelesTrak GP JSON (OMM) · SGP4-propagated at display time — orbital elements, not illustrative tracks";
  const byNorad = new Map<string, Record<string, unknown>>();
  const errors: string[] = [];

  for (const group of CELESTRAK_GROUPS) {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
    try {
      const res = await fetchRaw(url);
      if (!res.ok) {
        errors.push(`${group}: HTTP ${res.status}`);
        continue;
      }
      const parsed = JSON.parse(res.text) as unknown;
      if (!Array.isArray(parsed)) {
        errors.push(`${group}: not a JSON array`);
        continue;
      }
      for (const row of parsed) {
        const slim = slimCelestrakRow(row);
        if (!slim) continue;
        byNorad.set(String(slim.NORAD_CAT_ID), slim);
        if (byNorad.size >= SAT_CAP) break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 200) : "error";
      errors.push(`${group}: ${message}`);
    }
    if (byNorad.size >= SAT_CAP) break;
  }

  const records = [...byNorad.values()].slice(0, SAT_CAP);
  const fetchFailed = records.length === 0;
  const status = resolveLayerSourceState({
    layer: "satellites",
    now,
    fetchedAt: fetchFailed ? null : now,
    fetchFailed,
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
