import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import {
  STALE_AFTER_MS,
  isLayerId,
  isLayerSourceState,
  presentLayerSnapshotStatus,
  resolveLayerSourceState,
} from "./lib/layerState";

const RATE_LIMIT_MS = 45_000;
const lastLayerRefreshByUser = new Map<string, number>();

const layerArg = v.union(
  v.literal("firms"),
  v.literal("satellites"),
  v.literal("adsb"),
  v.literal("quakes"),
  v.literal("ais"),
  v.literal("launches"),
  v.literal("acled"),
);

export const getSnapshot = query({
  args: {
    layer: layerArg,
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const rows = await ctx.db
      .query("layerSnapshots")
      .withIndex("by_layer_and_fetchedAt", (q) => q.eq("layer", args.layer))
      .order("desc")
      .take(1);
    const row = rows[0];
    if (!row) {
      const keyPresent =
        args.layer === "firms"
          ? Boolean((process.env.FIRMS_MAP_KEY ?? "").trim())
          : args.layer === "acled"
            ? Boolean(
                (process.env.ACLED_ACCESS_TOKEN ?? "").trim() ||
                  ((process.env.ACLED_EMAIL ?? "").trim() &&
                    (process.env.ACLED_PASSWORD ?? "").trim()),
              )
          : true;
      const status = resolveLayerSourceState({
        layer: args.layer,
        now: args.now,
        fetchedAt: null,
        keyPresent,
      });
      return {
        layer: args.layer,
        status,
        fetchedAt: null as number | null,
        records: [] as unknown[],
        recordsReceived: 0,
        errorSummary: undefined as string | undefined,
        provenance:
          args.layer === "firms"
            ? "NASA FIRMS VIIRS NRT — no snapshot yet"
            : args.layer === "adsb"
              ? "adsb.lol military ADS-B — no snapshot yet"
              : args.layer === "quakes"
                ? "USGS M2.5+ earthquakes — no snapshot yet"
                : args.layer === "ais"
                  ? "Open Waters AIS — no snapshot yet"
                  : args.layer === "launches"
                    ? "Launch Library 2 — no snapshot yet"
                    : args.layer === "acled"
                      ? "ACLED Middle East + Ukraine — no snapshot yet"
                    : "CelesTrak GP/OMM — no snapshot yet",
      };
    }

    const storedStatus = isLayerSourceState(row.status)
      ? row.status
      : "UNAVAILABLE";
    const status = presentLayerSnapshotStatus({
      layer: args.layer,
      storedStatus,
      now: args.now,
      fetchedAt: row.fetchedAt,
      keyPresent:
        args.layer === "firms"
          ? Boolean((process.env.FIRMS_MAP_KEY ?? "").trim())
          : args.layer === "acled"
            ? Boolean(
                (process.env.ACLED_ACCESS_TOKEN ?? "").trim() ||
                  ((process.env.ACLED_EMAIL ?? "").trim() &&
                    (process.env.ACLED_PASSWORD ?? "").trim()),
              )
            : true,
      staleAfterMs: STALE_AFTER_MS[args.layer],
    });

    let records: unknown[] = [];
    try {
      const parsed = JSON.parse(row.recordsJson) as unknown;
      records = Array.isArray(parsed) ? parsed : [];
    } catch {
      records = [];
    }

    return {
      layer: args.layer,
      status,
      fetchedAt: row.fetchedAt,
      records,
      recordsReceived: row.recordsReceived,
      errorSummary: row.errorSummary,
      provenance: row.provenance,
    };
  },
});

export const replaceSnapshot = internalMutation({
  args: {
    layer: layerArg,
    fetchedAt: v.number(),
    status: v.union(
      v.literal("LIVE"),
      v.literal("STALE"),
      v.literal("KEY_REQUIRED"),
      v.literal("UNAVAILABLE"),
    ),
    recordsJson: v.string(),
    recordsReceived: v.number(),
    errorSummary: v.optional(v.string()),
    provenance: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("layerSnapshots")
      .withIndex("by_layer_and_fetchedAt", (q) => q.eq("layer", args.layer))
      .take(20);
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.insert("layerSnapshots", {
      layer: args.layer,
      fetchedAt: args.fetchedAt,
      status: args.status,
      recordsJson: args.recordsJson,
      recordsReceived: args.recordsReceived,
      errorSummary: args.errorSummary,
      provenance: args.provenance,
    });
  },
});

export const requestRefresh = mutation({
  args: {
    layer: v.optional(v.union(layerArg, v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const last = lastLayerRefreshByUser.get(user.clerkUserId) ?? 0;
    if (now - last < RATE_LIMIT_MS) {
      throw new Error("Layer refresh rate limited. Try again shortly.");
    }
    lastLayerRefreshByUser.set(user.clerkUserId, now);
    const layer = args.layer ?? "all";
    await ctx.scheduler.runAfter(0, internal.providers.fetchLayers.refresh, {
      layer,
    });
    return { scheduled: true, layer };
  },
});

/** Auth-gated action so the dashboard can wait on a first snapshot. */
export const refreshNow = action({
  args: {
    layer: v.optional(v.union(layerArg, v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const layer = args.layer ?? "all";
    if (layer !== "all" && !isLayerId(layer)) {
      throw new Error("Unknown layer");
    }
    await ctx.runAction(internal.providers.fetchLayers.refresh, { layer });
    return { ok: true, layer };
  },
});

