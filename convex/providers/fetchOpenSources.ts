"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  fetchEonetEvents,
  fetchGdacsEvents,
  fetchUnPeaceSecurity,
  fetchUsgsEvents,
  strategicTheaterBaselines,
} from "./openSources";
import type { ProviderRecord } from "../lib/normalize";

/**
 * Server-side multi-provider open-source refresh.
 * Partial failure is allowed — successful providers still upsert.
 */
export const refreshAll = internalAction({
  args: {
    clearSynthetic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: Array<{
      provider: string;
      ok: boolean;
      count: number;
      error?: string;
    }> = [];
    const all: Array<{ provider: string; records: ProviderRecord[] }> = [];

    const jobs: Array<{
      provider: string;
      run: () => Promise<ProviderRecord[]>;
    }> = [
      { provider: "strategic_theaters", run: async () => strategicTheaterBaselines(now) },
      { provider: "usgs", run: () => fetchUsgsEvents(now) },
      { provider: "gdacs", run: () => fetchGdacsEvents(now) },
      { provider: "eonet", run: () => fetchEonetEvents(now) },
      { provider: "un_peace", run: () => fetchUnPeaceSecurity(now) },
    ];

    for (const job of jobs) {
      try {
        const records = await job.run();
        all.push({ provider: job.provider, records });
        results.push({ provider: job.provider, ok: true, count: records.length });
      } catch (err) {
        const message =
          err instanceof Error ? err.message.slice(0, 400) : "unknown error";
        results.push({
          provider: job.provider,
          ok: false,
          count: 0,
          error: message,
        });
      }
    }

    await ctx.runMutation(internal.ingestion.upsertProviderBatch, {
      batches: all.map((b) => ({
        provider: b.provider,
        // Convex values need plain JSON — records are plain objects
        recordsJson: JSON.stringify(b.records),
      })),
      clearSynthetic: args.clearSynthetic ?? true,
      resultsJson: JSON.stringify(results),
    });

    return { results };
  },
});
