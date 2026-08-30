import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthedUser } from "./lib/auth";
import {
  isCategory,
  isSeverity,
  isTimeWindow,
  TIME_WINDOW_MS,
  type TimeWindow,
} from "./lib/constants";
import { explainPriority } from "./lib/priority";

const filterArgs = {
  categories: v.optional(v.array(v.string())),
  severities: v.optional(v.array(v.string())),
  regions: v.optional(v.array(v.string())),
  timeWindow: v.optional(v.string()),
  bookmarkedOnly: v.optional(v.boolean()),
  search: v.optional(v.string()),
};

function windowStart(timeWindow: TimeWindow | undefined, now: number): number {
  const tw = timeWindow && isTimeWindow(timeWindow) ? timeWindow : "7d";
  return now - TIME_WINDOW_MS[tw];
}

export const list = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await getAuthedUser(ctx);
    const now = Date.now();
    const since = windowStart(
      args.timeWindow as TimeWindow | undefined,
      now,
    );

    let bookmarkEventIds: Set<string> | null = null;
    if (args.bookmarkedOnly) {
      if (!user) return [];
      const bms = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      bookmarkEventIds = new Set(bms.map((b) => b.eventId));
    }

    // Pull recent active events; filter in memory for multi-dimension prototype scale.
    const all = await ctx.db
      .query("events")
      .withIndex("by_occurredAt")
      .order("desc")
      .take(500);

    const categories = (args.categories ?? []).filter(isCategory);
    const severities = (args.severities ?? []).filter(isSeverity);
    const regions = args.regions ?? [];
    const search = args.search?.trim().toLowerCase().slice(0, 100);

    const filtered = all.filter((e) => {
      if (e.isSynthetic) return false;
      if (e.status !== "active") return false;
      if (e.occurredAt < since) return false;
      if (categories.length && !categories.includes(e.category)) return false;
      if (severities.length && !severities.includes(e.severity)) return false;
      if (regions.length && !regions.includes(e.region)) return false;
      if (bookmarkEventIds && !bookmarkEventIds.has(e._id)) return false;
      if (search) {
        const hay = `${e.headline} ${e.summary} ${e.region}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => b.priorityScore - a.priorityScore);

    let bookmarked = new Set<string>();
    if (user) {
      const bms = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      bookmarked = new Set(bms.map((b) => b.eventId as string));
    }

    return filtered.map((e) => ({
      ...e,
      bookmarked: bookmarked.has(e._id),
      rankExplanation: explainPriority({
        severity: e.severity,
        confidence: e.confidence,
        sourceCount: e.sourceCount,
        occurredAt: e.occurredAt,
        now,
      }),
    }));
  },
});

export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const sources = await ctx.db
      .query("eventSources")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    const user = await getAuthedUser(ctx);
    let bookmarked = false;
    if (user) {
      const bm = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_eventId", (q) =>
          q.eq("userId", user._id).eq("eventId", args.eventId),
        )
        .unique();
      bookmarked = !!bm;
    }

    // Related: same region or category, recent
    const related = (
      await ctx.db
        .query("events")
        .withIndex("by_region_occurredAt", (q) => q.eq("region", event.region))
        .order("desc")
        .take(10)
    )
      .filter((e) => e._id !== event._id && e.status === "active")
      .slice(0, 5);

    return {
      ...event,
      sources,
      bookmarked,
      related,
      rankExplanation: explainPriority({
        severity: event.severity,
        confidence: event.confidence,
        sourceCount: event.sourceCount,
        occurredAt: event.occurredAt,
      }),
    };
  },
});

export const overview = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const now = Date.now();
    const since = windowStart(
      args.timeWindow as TimeWindow | undefined,
      now,
    );
    const dayAgo = now - TIME_WINDOW_MS["24h"];

    const all = await ctx.db
      .query("events")
      .withIndex("by_occurredAt")
      .order("desc")
      .take(500);

    const categories = (args.categories ?? []).filter(isCategory);
    const severities = (args.severities ?? []).filter(isSeverity);
    const regions = args.regions ?? [];

    const filtered = all.filter((e) => {
      if (e.isSynthetic) return false;
      if (e.status !== "active") return false;
      if (e.occurredAt < since) return false;
      if (categories.length && !categories.includes(e.category)) return false;
      if (severities.length && !severities.includes(e.severity)) return false;
      if (regions.length && !regions.includes(e.region)) return false;
      return true;
    });

    const critical = filtered.filter((e) => e.severity === "critical").length;
    const high = filtered.filter((e) => e.severity === "high").length;
    const addedLast24h = filtered.filter((e) => e.firstObservedAt >= dayAgo)
      .length;

    const regionCounts = new Map<string, number>();
    for (const e of filtered) {
      regionCounts.set(e.region, (regionCounts.get(e.region) ?? 0) + 1);
    }
    const elevatedRegions = [...regionCounts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, count]) => ({ region, count }));

    const lastSuccess = (
      await ctx.db
        .query("ingestionRuns")
        .withIndex("by_status_startedAt", (q) => q.eq("status", "succeeded"))
        .order("desc")
        .take(1)
    )[0];

    const demoDataActive = filtered.some((e) => e.isSynthetic);

    return {
      criticalCount: critical,
      highCount: high,
      elevatedRegions,
      addedLast24h,
      lastSuccessfulRefreshAt: lastSuccess?.completedAt ?? null,
      totalMatching: filtered.length,
      demoDataActive,
    };
  },
});
