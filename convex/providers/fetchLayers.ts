/**
 * Fetch NASA FIRMS, TLEs, ADS-B, USGS, AIS, and Launch Library into layerSnapshots.
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
import { parseAdsbLol } from "../lib/adsb";
import { parseUsgsGeojson } from "../lib/quakes";
import {
  AIS_THEATER_BBOXES,
  mergeAisContacts,
  parseOpenWatersVessels,
  type AisContact,
} from "../lib/ais";
import { parseLaunchLibrary } from "../lib/launches";
import { acledCountryQuery, parseAcledPayload } from "../lib/acled";
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
  opts?: {
    timeoutMs?: number;
    maxBytes?: number;
    accept?: string;
    method?: string;
    body?: string;
    contentType?: string;
    authorization?: string;
  },
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
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: opts?.accept ?? "text/csv, application/json, text/plain, */*",
    };
    if (opts?.contentType) headers["Content-Type"] = opts.contentType;
    if (opts?.authorization) headers.Authorization = opts.authorization;
    const res = await fetch(url, {
      signal: controller.signal,
      method: opts?.method ?? "GET",
      headers,
      body: opts?.body,
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
    "NASA FIRMS Suomi-NPP VIIRS C2 Global 24h";

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
    "Live TLE · SGP4 at display time";
  const liveProvenance =
    "CelesTrak GP JSON · SGP4 at display time";
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

async function writeLayer(
  ctx: ActionCtx,
  args: {
    layer: LayerId;
    now: number;
    status: "LIVE" | "STALE" | "KEY_REQUIRED" | "UNAVAILABLE";
    records: unknown[];
    provenance: string;
    errorSummary?: string;
  },
) {
  await ctx.runMutation(internal.layers.replaceSnapshot, {
    layer: args.layer,
    fetchedAt: args.now,
    status: args.status,
    recordsJson: JSON.stringify(args.records),
    recordsReceived: args.records.length,
    errorSummary: args.errorSummary,
    provenance: args.provenance,
  });
}

async function refreshQuakes(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "USGS M2.5+ earthquakes (24h)";
  try {
    const res = await fetchRaw(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      { timeoutMs: 15_000, maxBytes: 4_000_000, accept: "application/json" },
    );
    if (!res.ok) {
      await writeLayer(ctx, {
        layer: "quakes",
        now,
        status: "UNAVAILABLE",
        records: [],
        provenance,
        errorSummary: `USGS HTTP ${res.status}`,
      });
      return;
    }
    const contacts = parseUsgsGeojson(JSON.parse(res.text) as unknown);
    await writeLayer(ctx, {
      layer: "quakes",
      now,
      status: contacts.length > 0 ? "LIVE" : "UNAVAILABLE",
      records: contacts,
      provenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await writeLayer(ctx, {
      layer: "quakes",
      now,
      status: "UNAVAILABLE",
      records: [],
      provenance,
      errorSummary: message,
    });
  }
}

async function refreshAis(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "Open Waters AIS · theater vessels";
  const batches: AisContact[][] = [];
  const errors: string[] = [];
  try {
    for (const box of AIS_THEATER_BBOXES) {
      const url = `https://ais.openwaters.io/v1/vessels?bbox=${box.bbox}`;
      try {
        const res = await fetchRaw(url, {
          timeoutMs: 12_000,
          maxBytes: 4_000_000,
          accept: "application/geo+json, application/json",
        });
        if (!res.ok) {
          errors.push(`${box.id}: HTTP ${res.status}`);
          continue;
        }
        batches.push(parseOpenWatersVessels(JSON.parse(res.text) as unknown, 90));
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 80) : "error";
        errors.push(`${box.id}: ${message}`);
      }
    }
    const contacts = mergeAisContacts(batches);
    await writeLayer(ctx, {
      layer: "ais",
      now,
      status: contacts.length > 0 ? "LIVE" : "UNAVAILABLE",
      records: contacts,
      provenance,
      errorSummary: errors.length ? errors.join("; ").slice(0, 400) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await writeLayer(ctx, {
      layer: "ais",
      now,
      status: "UNAVAILABLE",
      records: [],
      provenance,
      errorSummary: message,
    });
  }
}

async function refreshLaunches(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "Launch Library 2 (The Space Devs) · upcoming pads, not range safety";
  try {
    const res = await fetchRaw(
      "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=16&mode=detailed",
      { timeoutMs: 20_000, maxBytes: 2_000_000, accept: "application/json" },
    );
    if (!res.ok) {
      await writeLayer(ctx, {
        layer: "launches",
        now,
        status: "UNAVAILABLE",
        records: [],
        provenance,
        errorSummary: `LL2 HTTP ${res.status}`,
      });
      return;
    }
    const contacts = parseLaunchLibrary(JSON.parse(res.text) as unknown);
    await writeLayer(ctx, {
      layer: "launches",
      now,
      status: contacts.length > 0 ? "LIVE" : "UNAVAILABLE",
      records: contacts,
      provenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await writeLayer(ctx, {
      layer: "launches",
      now,
      status: "UNAVAILABLE",
      records: [],
      provenance,
      errorSummary: message,
    });
  }
}

async function acledAccessToken(): Promise<string | null> {
  const staticTok = (process.env.ACLED_ACCESS_TOKEN ?? "").trim();
  if (staticTok) return staticTok;
  const email = (process.env.ACLED_EMAIL ?? "").trim();
  const password = (process.env.ACLED_PASSWORD ?? "").trim();
  if (!email || !password) return null;
  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: "password",
    client_id: "acled",
    scope: "authenticated",
  }).toString();
  const res = await fetchRaw("https://acleddata.com/oauth/token", {
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    accept: "application/json",
    body,
    timeoutMs: 12_000,
    maxBytes: 50_000,
  });
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(res.text) as { access_token?: unknown };
    return typeof parsed.access_token === "string" && parsed.access_token
      ? parsed.access_token
      : null;
  } catch {
    return null;
  }
}

async function refreshAcled(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "ACLED Middle East + Ukraine (myACLED) · coded political violence";
  const token = await acledAccessToken();
  if (!token) {
    await writeLayer(ctx, {
      layer: "acled",
      now,
      status: "KEY_REQUIRED",
      records: [],
      provenance,
      errorSummary:
        "Set ACLED_EMAIL + ACLED_PASSWORD (myACLED Research+) or ACLED_ACCESS_TOKEN",
    });
    return;
  }
  const end = new Date(now).toISOString().slice(0, 10);
  const start = new Date(now - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const url =
    `https://acleddata.com/api/acled/read?_format=json` +
    `&${acledCountryQuery()}` +
    `&event_date=${start}|${end}&event_date_where=BETWEEN&limit=500`;
  try {
    const res = await fetchRaw(url, {
      timeoutMs: 20_000,
      maxBytes: 4_000_000,
      accept: "application/json",
      authorization: `Bearer ${token}`,
    });
    if (!res.ok) {
      const status = res.status === 401 || res.status === 403 ? "KEY_REQUIRED" : "UNAVAILABLE";
      await writeLayer(ctx, {
        layer: "acled",
        now,
        status,
        records: [],
        provenance,
        errorSummary: `ACLED HTTP ${res.status}`,
      });
      return;
    }
    const contacts = parseAcledPayload(JSON.parse(res.text) as unknown);
    await writeLayer(ctx, {
      layer: "acled",
      now,
      status: contacts.length > 0 ? "LIVE" : "UNAVAILABLE",
      records: contacts,
      provenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await writeLayer(ctx, {
      layer: "acled",
      now,
      status: "UNAVAILABLE",
      records: [],
      provenance,
      errorSummary: message,
    });
  }
}

async function refreshAdsb(ctx: ActionCtx) {
  const now = Date.now();
  const provenance =
    "adsb.lol military ADS-B";
  try {
    const res = await fetchRaw("https://api.adsb.lol/v2/mil", {
      timeoutMs: 15_000,
      maxBytes: 4_000_000,
      accept: "application/json",
    });
    if (!res.ok) {
      await ctx.runMutation(internal.layers.replaceSnapshot, {
        layer: "adsb",
        fetchedAt: now,
        status: "UNAVAILABLE",
        recordsJson: "[]",
        recordsReceived: 0,
        errorSummary: `adsb.lol HTTP ${res.status}`,
        provenance,
      });
      return;
    }
    const contacts = parseAdsbLol(JSON.parse(res.text) as unknown);
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "adsb",
      fetchedAt: now,
      status: contacts.length > 0 ? "LIVE" : "UNAVAILABLE",
      recordsJson: JSON.stringify(contacts),
      recordsReceived: contacts.length,
      provenance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 400) : "fetch failed";
    await ctx.runMutation(internal.layers.replaceSnapshot, {
      layer: "adsb",
      fetchedAt: now,
      status: "UNAVAILABLE",
      recordsJson: "[]",
      recordsReceived: 0,
      errorSummary: message,
      provenance,
    });
  }
}

export const refresh = internalAction({
  args: {
    layer: v.union(
      v.literal("firms"),
      v.literal("satellites"),
      v.literal("adsb"),
      v.literal("quakes"),
      v.literal("ais"),
      v.literal("launches"),
      v.literal("acled"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, args) => {
    const layers: LayerId[] =
      args.layer === "all"
        ? ["firms", "satellites", "adsb", "quakes", "ais", "launches", "acled"]
        : [args.layer];
    for (const layer of layers) {
      if (layer === "firms") await refreshFirms(ctx);
      else if (layer === "satellites") await refreshSatellites(ctx);
      else if (layer === "adsb") await refreshAdsb(ctx);
      else if (layer === "quakes") await refreshQuakes(ctx);
      else if (layer === "ais") await refreshAis(ctx);
      else if (layer === "launches") await refreshLaunches(ctx);
      else await refreshAcled(ctx);
    }
    return { ok: true, layer: args.layer };
  },
});
