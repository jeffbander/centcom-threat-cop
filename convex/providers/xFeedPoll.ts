"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  fetchUserTimeline,
  isXApiConfigured,
  lookupUserByUsername,
} from "./xApi";
import { inferGeoFromPost, scoreXPost } from "../lib/xSignal";

/**
 * Poll all enabled tracked X accounts and upsert posts.
 * Partial failure per account is recorded; does not wipe existing posts.
 */
export const pollAll = internalAction({
  args: {
    maxPerAccount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isXApiConfigured()) {
      await ctx.runMutation(internal.xFeed.recordPollRun, {
        status: "failed",
        recordsReceived: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorSummary:
          "X_BEARER_TOKEN missing on Convex deployment. Configure X API bearer to poll OSINT accounts.",
      });
      return { ok: false, reason: "no_token" as const };
    }

    const accounts = await ctx.runQuery(internal.xFeed.listEnabledInternal, {});
    const max = args.maxPerAccount ?? 15;
    let created = 0;
    let updated = 0;
    let received = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        let xUserId = account.xUserId;
        let displayName = account.displayName;
        if (!xUserId) {
          const user = await lookupUserByUsername(account.handle);
          if (!user) {
            errors.push(`@${account.handle}: not found`);
            await ctx.runMutation(internal.xFeed.markAccountPolled, {
              id: account._id,
              error: "User not found on X",
            });
            continue;
          }
          xUserId = user.id;
          displayName = user.name;
          await ctx.runMutation(internal.xFeed.patchAccountMeta, {
            id: account._id,
            xUserId,
            displayName,
          });
        }

        const tweets = await fetchUserTimeline(xUserId, max);
        received += tweets.length;

        const posts = tweets.map((t) => {
          const postedAt = t.created_at
            ? Date.parse(t.created_at)
            : Date.now();
          const geo = inferGeoFromPost(t.text);
          return {
            externalId: t.id,
            handle: account.handle,
            authorName: displayName,
            text: t.text,
            url: `https://x.com/${account.handle}/status/${t.id}`,
            postedAt: Number.isFinite(postedAt) ? postedAt : Date.now(),
            feedChannel: account.feedChannel,
            tags: account.tags,
            likeCount: t.public_metrics?.like_count,
            repostCount: t.public_metrics?.retweet_count,
            replyCount: t.public_metrics?.reply_count,
            signalScore: scoreXPost(t.text),
            inferredRegion: geo.region,
            inferredLat: geo.lat,
            inferredLon: geo.lon,
          };
        });

        const result = await ctx.runMutation(internal.xFeed.upsertPosts, {
          posts,
        });
        created += result.created;
        updated += result.updated;

        await ctx.runMutation(internal.xFeed.markAccountPolled, {
          id: account._id,
          error: undefined,
        });

        // Mild delay between accounts to respect rate limits
        await new Promise((r) => setTimeout(r, 350));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message.slice(0, 200) : "poll failed";
        errors.push(`@${account.handle}: ${msg}`);
        await ctx.runMutation(internal.xFeed.markAccountPolled, {
          id: account._id,
          error: msg,
        });
      }
    }

    await ctx.runMutation(internal.xFeed.recordPollRun, {
      status:
        errors.length === 0
          ? "succeeded"
          : received > 0
            ? "partial"
            : "failed",
      recordsReceived: received,
      recordsCreated: created,
      recordsUpdated: updated,
      errorSummary: errors.length ? errors.join("; ").slice(0, 500) : undefined,
    });

    return {
      ok: errors.length === 0,
      received,
      created,
      updated,
      errors,
    };
  },
});
