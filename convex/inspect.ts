import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  mergeTracks,
  parseOpenSkyTrack,
  parseOverpassWebcams,
  type PublicCam,
  type TrackPoint,
} from "./lib/tracks";
import { nearbyCuratedWebcams } from "./lib/publicWebcams";

const lastInspectByUser = new Map<string, number>();
const INSPECT_RATE_MS = 8_000;

async function fetchText(
  url: string,
  opts?: { timeoutMs?: number; method?: string; body?: string; contentType?: string },
): Promise<{ ok: boolean; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 10_000);
  try {
    const res = await fetch(url, {
      method: opts?.method ?? "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "centcom-threat-cop/1.0 (public COP overlays)",
        ...(opts?.contentType ? { "Content-Type": opts.contentType } : {}),
      },
      body: opts?.body,
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, text };
  } catch {
    return { ok: false, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function liveAdsbTrack(hex: string): Promise<TrackPoint[]> {
  const icao = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(icao)) return [];
  const res = await fetchText(
    `https://opensky-network.org/api/tracks/all?icao24=${icao}&time=0`,
    { timeoutMs: 10_000 },
  );
  if (!res.ok) return [];
  try {
    return parseOpenSkyTrack(JSON.parse(res.text) as unknown);
  } catch {
    return [];
  }
}

async function liveOsmWebcams(
  lat: number,
  lon: number,
): Promise<PublicCam[]> {
  const q = `[out:json][timeout:12];(nwr["tourism"="webcam"](around:50000,${lat},${lon}););out center tags 12;`;
  const res = await fetchText("https://overpass-api.de/api/interpreter", {
    timeoutMs: 14_000,
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    body: "data=" + encodeURIComponent(q),
  });
  if (!res.ok) return [];
  try {
    return parseOverpassWebcams(JSON.parse(res.text) as unknown, {
      latitude: lat,
      longitude: lon,
    });
  } catch {
    return [];
  }
}

type InspectResult = {
  track: TrackPoint[];
  cameras: PublicCam[];
  trackProvenance: string;
  cameraNote: string;
};

export const contact = action({
  args: {
    kind: v.union(
      v.literal("adsb"),
      v.literal("ais"),
      v.literal("firms"),
      v.literal("quake"),
      v.literal("launch"),
      v.literal("satellite"),
      v.literal("acled"),
    ),
    contactId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args): Promise<InspectResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        track: [] as TrackPoint[],
        cameras: [] as PublicCam[],
        trackProvenance: "sign-in required",
        cameraNote: "Public OSM / NPS / USGS / NOAA listings within 50 km.",
      };
    }
    const prev = lastInspectByUser.get(identity.subject) ?? 0;
    if (Date.now() - prev < INSPECT_RATE_MS) {
      const stored = await ctx.runQuery(internal.tracks.getStored, {
        contactId: args.contactId,
      });
      return {
        track: stored?.points ?? [],
        cameras: nearbyCuratedWebcams({
          latitude: args.latitude,
          longitude: args.longitude,
        }),
        trackProvenance: "rate-limited · showing stored snapshots",
        cameraNote: "Public listings within 50 km. Not CCTV.",
      };
    }
    lastInspectByUser.set(identity.subject, Date.now());

    const stored = await ctx.runQuery(internal.tracks.getStored, {
      contactId: args.contactId,
    });
    let live: TrackPoint[] = [];
    let trackProvenance = "our ADS-B/AIS snapshots (2–5 min)";
    if (args.kind === "adsb" && args.contactId.startsWith("adsb:")) {
      const hex = args.contactId.slice(5);
      live = await liveAdsbTrack(hex);
      if (live.length > 0) {
        trackProvenance = "OpenSky Network live track + our snapshots";
      }
    } else if (args.kind === "firms") {
      trackProvenance = "FIRMS 24h heat pixels near this detection (not a vehicle track)";
    } else if (args.kind === "satellite") {
      trackProvenance = "SGP4 predicted ground track is already drawn on the map";
    } else if (args.kind === "ais") {
      trackProvenance = "Open Waters AIS snapshots we stored (5 min)";
    } else {
      trackProvenance = "No 24h vehicle track for this contact type";
    }

    const merged = mergeTracks(stored?.points ?? [], live);
    if (merged.length > 0 && (args.kind === "adsb" || args.kind === "ais")) {
      await ctx.runMutation(internal.tracks.mergeLive, {
        contactId: args.contactId,
        kind: args.kind,
        pointsJson: JSON.stringify(merged),
        now: Date.now(),
      });
    }

    const curated = nearbyCuratedWebcams({
      latitude: args.latitude,
      longitude: args.longitude,
    });
    const osm = await liveOsmWebcams(args.latitude, args.longitude);
    const byId = new Map<string, PublicCam>();
    for (const c of [...curated, ...osm]) byId.set(c.id, c);
    const cameras = [...byId.values()]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);

    return {
      track: merged,
      cameras,
      trackProvenance,
      cameraNote:
        "Public webcams only (OSM tourism=webcam, NPS, USGS, NOAA). Not a CCTV tap.",
    };
  },
});
