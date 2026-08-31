import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { appendPoint, type TrackPoint } from "./lib/tracks";

function parsePoints(raw: string): TrackPoint[] {
  try {
    const json = JSON.parse(raw) as unknown;
    if (!Array.isArray(json)) return [];
    const out: TrackPoint[] = [];
    for (const row of json) {
      if (!row || typeof row !== "object") continue;
      const p = row as TrackPoint;
      if (
        Number.isFinite(p.t) &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude)
      ) {
        out.push({ t: p.t, latitude: p.latitude, longitude: p.longitude });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function loadTrack(ctx: QueryCtx, contactId: string) {
  const row = await ctx.db
    .query("contactTracks")
    .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
    .unique();
  if (!row) return { contactId, points: [] as TrackPoint[] };
  return { contactId: row.contactId, points: parsePoints(row.pointsJson) };
}

export const getStored = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => loadTrack(ctx, args.contactId),
});

export const get = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return loadTrack(ctx, args.contactId);
  },
});

export const appendBatch = internalMutation({
  args: {
    kind: v.union(v.literal("adsb"), v.literal("ais"), v.literal("firms")),
    now: v.number(),
    samples: v.array(
      v.object({
        contactId: v.string(),
        latitude: v.number(),
        longitude: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const cap = args.kind === "adsb" ? 80 : 60;
    const samples = args.samples.slice(0, cap);
    for (const s of samples) {
      const existing = await ctx.db
        .query("contactTracks")
        .withIndex("by_contactId", (q) => q.eq("contactId", s.contactId))
        .unique();
      const prev = existing ? parsePoints(existing.pointsJson) : [];
      const next = appendPoint(prev, {
        t: args.now,
        latitude: s.latitude,
        longitude: s.longitude,
      });
      const pointsJson = JSON.stringify(next);
      if (existing) {
        await ctx.db.patch(existing._id, {
          pointsJson,
          updatedAt: args.now,
        });
      } else {
        await ctx.db.insert("contactTracks", {
          contactId: s.contactId,
          kind: args.kind,
          pointsJson,
          updatedAt: args.now,
        });
      }
    }
  },
});

export const mergeLive = internalMutation({
  args: {
    contactId: v.string(),
    kind: v.union(v.literal("adsb"), v.literal("ais"), v.literal("firms")),
    pointsJson: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contactTracks")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        pointsJson: args.pointsJson,
        updatedAt: args.now,
      });
    } else {
      await ctx.db.insert("contactTracks", {
        contactId: args.contactId,
        kind: args.kind,
        pointsJson: args.pointsJson,
        updatedAt: args.now,
      });
    }
  },
});
