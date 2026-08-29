import { query } from "./_generated/server";
import { LIVE_INGEST_PROVIDERS } from "./lib/constants";
import { composeSituationBrief, type BriefEvent } from "./lib/briefing";

export const situation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_occurredAt")
      .order("desc")
      .take(500);
    const runs = await ctx.db.query("ingestionRuns").order("desc").take(60);

    const briefEvents: BriefEvent[] = events
      .filter((e) => e.status === "active")
      .map((e) => ({
        _id: e._id,
        headline: e.headline,
        category: e.category,
        severity: e.severity,
        region: e.region,
        priorityScore: e.priorityScore,
        occurredAt: e.occurredAt,
        isSynthetic: e.isSynthetic,
        ingestionSource: e.ingestionSource,
      }));

    return composeSituationBrief({
      now,
      events: briefEvents,
      runs: runs.map((r) => ({
        provider: r.provider,
        status: r.status,
        completedAt: r.completedAt,
        errorSummary: r.errorSummary,
        recordsReceived: r.recordsReceived,
      })),
      expectedProviders: LIVE_INGEST_PROVIDERS,
    });
  },
});
