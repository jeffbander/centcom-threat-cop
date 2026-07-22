import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireIdentity, requireUser } from "./lib/auth";
import { isProviderId } from "./lib/constants";
import { normalizeProviderRecord, type ProviderRecord } from "./lib/normalize";
import { generateSyntheticEvents } from "./providers/synthetic";

const RATE_LIMIT_MS = 45_000;
const lastManualRefreshByUser = new Map<string, number>();

/** Public status of last ingestion + whether demo data is active. */
export const freshness = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const runs = await ctx.db
      .query("ingestionRuns")
      .withIndex("by_status_startedAt", (q) => q.eq("status", "succeeded"))
      .order("desc")
      .take(15);

    const lastSuccess = runs[0] ?? null;
    const anyEvents = await ctx.db.query("events").take(200);
    const demoDataActive =
      anyEvents.length > 0 && anyEvents.every((e) => e.isSynthetic);
    const liveCount = anyEvents.filter((e) => !e.isSynthetic).length;
    const providers = [
      ...new Set(anyEvents.map((e) => e.ingestionSource)),
    ];

    return {
      lastRun: lastSuccess,
      lastSuccessAt: lastSuccess?.completedAt ?? null,
      lastSuccessStatus: lastSuccess?.status ?? null,
      isStale:
        lastSuccess?.completedAt != null
          ? Date.now() - lastSuccess.completedAt > 3 * 60 * 60 * 1000
          : anyEvents.length === 0,
      demoDataActive,
      liveOpenSourceActive: liveCount > 0,
      liveCount,
      eventCount: anyEvents.length,
      providers,
    };
  },
});

export const listRecentRuns = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("ingestionRuns").order("desc").take(20);
  },
});

/**
 * Manual refresh — authenticated, rate-limited.
 * Default: full open-source multi-provider pull.
 */
export const requestRefresh = mutation({
  args: {
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const provider = args.provider ?? "open_sources";
    if (!isProviderId(provider)) {
      throw new Error("Unknown provider");
    }

    const now = Date.now();
    const last = lastManualRefreshByUser.get(user.clerkUserId) ?? 0;
    if (now - last < RATE_LIMIT_MS) {
      throw new Error("Refresh rate limited. Try again shortly.");
    }
    lastManualRefreshByUser.set(user.clerkUserId, now);

    if (provider === "synthetic") {
      await ctx.scheduler.runAfter(0, internal.ingestion.runProvider, {
        provider: "synthetic",
      });
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.providers.fetchOpenSources.refreshAll,
        { clearSynthetic: true },
      );
    }
    return { scheduled: true, provider };
  },
});

/** Upsert a batch of provider payloads (from internal action). */
export const upsertProviderBatch = internalMutation({
  args: {
    batches: v.array(
      v.object({
        provider: v.string(),
        recordsJson: v.string(),
      }),
    ),
    clearSynthetic: v.boolean(),
    resultsJson: v.string(),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalReceived = 0;
    const results = JSON.parse(args.resultsJson) as Array<{
      provider: string;
      ok: boolean;
      count: number;
      error?: string;
    }>;

    if (args.clearSynthetic) {
      // Remove demo-only rows once live open-source data is present.
      const synthetic = await ctx.db
        .query("events")
        .withIndex("by_ingestionSource", (q) =>
          q.eq("ingestionSource", "synthetic"),
        )
        .take(200);
      for (const e of synthetic) {
        const sources = await ctx.db
          .query("eventSources")
          .withIndex("by_eventId", (q) => q.eq("eventId", e._id))
          .collect();
        for (const s of sources) await ctx.db.delete(s._id);
        await ctx.db.delete(e._id);
      }
    }

    for (const batch of args.batches) {
      let records: ProviderRecord[] = [];
      try {
        records = JSON.parse(batch.recordsJson) as ProviderRecord[];
      } catch {
        continue;
      }

      const regionCounts = new Map<string, number>();
      for (const r of records) {
        regionCounts.set(r.region, (regionCounts.get(r.region) ?? 0) + 1);
      }

      let created = 0;
      let updated = 0;
      let received = 0;

      for (const raw of records) {
        received++;
        totalReceived++;
        const regionalActivity = (regionCounts.get(raw.region) ?? 1) - 1;
        const normalized = normalizeProviderRecord(
          raw,
          batch.provider,
          startedAt,
          regionalActivity,
        );
        if (!normalized) continue;

        const existing = await ctx.db
          .query("events")
          .withIndex("by_externalId", (q) =>
            q.eq("externalId", normalized.externalId),
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            headline: normalized.headline,
            summary: normalized.summary,
            category: normalized.category,
            severity: normalized.severity,
            confidence: normalized.confidence,
            countryCode: normalized.countryCode,
            region: normalized.region,
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            occurredAt: normalized.occurredAt,
            updatedAt: startedAt,
            sourceCount: normalized.sourceCount,
            status: normalized.status,
            priorityScore: normalized.priorityScore,
            generatedContentDisclosure: normalized.generatedContentDisclosure,
            ingestionSource: normalized.ingestionSource,
            isSynthetic: normalized.isSynthetic,
            whyItMatters: normalized.whyItMatters,
          });
          const oldSources = await ctx.db
            .query("eventSources")
            .withIndex("by_eventId", (q) => q.eq("eventId", existing._id))
            .collect();
          for (const s of oldSources) await ctx.db.delete(s._id);
          for (const s of normalized.sources) {
            await ctx.db.insert("eventSources", {
              eventId: existing._id,
              ...s,
            });
          }
          updated++;
          totalUpdated++;
        } else {
          const eventId = await ctx.db.insert("events", {
            externalId: normalized.externalId,
            headline: normalized.headline,
            summary: normalized.summary,
            category: normalized.category,
            severity: normalized.severity,
            confidence: normalized.confidence,
            countryCode: normalized.countryCode,
            region: normalized.region,
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            occurredAt: normalized.occurredAt,
            firstObservedAt: normalized.firstObservedAt,
            updatedAt: startedAt,
            sourceCount: normalized.sourceCount,
            status: normalized.status,
            priorityScore: normalized.priorityScore,
            generatedContentDisclosure: normalized.generatedContentDisclosure,
            ingestionSource: normalized.ingestionSource,
            isSynthetic: normalized.isSynthetic,
            whyItMatters: normalized.whyItMatters,
          });
          for (const s of normalized.sources) {
            await ctx.db.insert("eventSources", {
              eventId,
              ...s,
            });
          }
          created++;
          totalCreated++;
        }
      }

      const providerResult = results.find((r) => r.provider === batch.provider);
      await ctx.db.insert("ingestionRuns", {
        provider: batch.provider,
        startedAt,
        completedAt: Date.now(),
        status: providerResult?.ok === false ? "failed" : "succeeded",
        recordsReceived: received,
        recordsCreated: created,
        recordsUpdated: updated,
        errorSummary: providerResult?.error,
      });
    }

    // Overall rollup run
    const failed = results.filter((r) => !r.ok);
    await ctx.db.insert("ingestionRuns", {
      provider: "open_sources",
      startedAt,
      completedAt: Date.now(),
      status:
        failed.length === 0
          ? "succeeded"
          : failed.length === results.length
            ? "failed"
            : "partial",
      recordsReceived: totalReceived,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      errorSummary:
        failed.length > 0
          ? failed.map((f) => `${f.provider}: ${f.error ?? "fail"}`).join("; ").slice(0, 500)
          : undefined,
    });
  },
});

export const runProvider = internalMutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.provider !== "synthetic") {
      throw new Error("Use fetchOpenSources.refreshAll for live providers");
    }

    const startedAt = Date.now();
    const runId = await ctx.db.insert("ingestionRuns", {
      provider: "synthetic",
      startedAt,
      status: "running",
      recordsReceived: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
    });

    try {
      const records = generateSyntheticEvents(startedAt);
      await ctx.scheduler.runAfter(0, internal.ingestion.upsertProviderBatch, {
        batches: [
          { provider: "synthetic", recordsJson: JSON.stringify(records) },
        ],
        clearSynthetic: false,
        resultsJson: JSON.stringify([
          { provider: "synthetic", ok: true, count: records.length },
        ]),
      });
      await ctx.db.patch(runId, {
        status: "succeeded",
        completedAt: Date.now(),
        recordsReceived: records.length,
        recordsCreated: 0,
        recordsUpdated: 0,
      });
    } catch (err) {
      await ctx.db.patch(runId, {
        status: "failed",
        completedAt: Date.now(),
        errorSummary:
          err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
      });
    }
  },
});

/** Bootstrap: pull live open-source threat picture (clears synthetic). */
export const bootstrapIfNeeded = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    await requireUser(ctx);

    const anyLive = await ctx.db.query("events").take(50);
    const hasLive = anyLive.some((e) => !e.isSynthetic);
    const lastSuccess = (
      await ctx.db
        .query("ingestionRuns")
        .withIndex("by_status_startedAt", (q) => q.eq("status", "succeeded"))
        .order("desc")
        .take(5)
    ).find((r) => r.provider === "open_sources" || r.provider === "usgs");

    const stale =
      !lastSuccess?.completedAt ||
      Date.now() - lastSuccess.completedAt > 2 * 60 * 60 * 1000;

    if (!hasLive || stale) {
      await ctx.scheduler.runAfter(
        0,
        internal.providers.fetchOpenSources.refreshAll,
        { clearSynthetic: true },
      );
      return { bootstrapped: true, reason: hasLive ? "stale" : "empty" };
    }
    return { bootstrapped: false };
  },
});

export const getRun = internalQuery({
  args: { id: v.id("ingestionRuns") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});
