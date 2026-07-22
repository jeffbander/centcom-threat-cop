import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import {
  DEFAULT_X_OSINT_ACCOUNTS,
  isValidHandle,
  normalizeHandle,
} from "./lib/xSignal";

/** Align with client 30m cadence; still blocks spam clicks on Pull now. */
const RATE_MS = 45_000;
const lastPollByUser = new Map<string, number>();

export const status = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const accounts = await ctx.db.query("xTrackedAccounts").collect();
    const recent = await ctx.db
      .query("xPosts")
      .withIndex("by_postedAt")
      .order("desc")
      .take(1);
    const runs = await ctx.db
      .query("ingestionRuns")
      .withIndex("by_provider_startedAt", (q) => q.eq("provider", "x_osint"))
      .order("desc")
      .take(1);

    return {
      accountCount: accounts.length,
      enabledCount: accounts.filter((a) => a.enabled).length,
      lastPostAt: recent[0]?.postedAt ?? null,
      lastPoll: runs[0] ?? null,
      /** Client hint — actual secret lives only on Convex */
      needsApiToken:
        runs[0]?.errorSummary?.includes("X_BEARER_TOKEN") ?? false,
    };
  },
});

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("xTrackedAccounts").collect();
  },
});

export const listPosts = query({
  args: {
    feedChannel: v.optional(v.string()),
    handle: v.optional(v.string()),
    minSignal: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = Math.min(args.limit ?? 40, 100);
    let posts;
    if (args.handle) {
      const h = normalizeHandle(args.handle);
      posts = await ctx.db
        .query("xPosts")
        .withIndex("by_handle_postedAt", (q) => q.eq("handle", h))
        .order("desc")
        .take(limit * 2);
    } else if (args.feedChannel && args.feedChannel !== "all") {
      posts = await ctx.db
        .query("xPosts")
        .withIndex("by_feedChannel_postedAt", (q) =>
          q.eq("feedChannel", args.feedChannel!),
        )
        .order("desc")
        .take(limit * 2);
    } else {
      posts = await ctx.db
        .query("xPosts")
        .withIndex("by_postedAt")
        .order("desc")
        .take(limit * 2);
    }

    const min = args.minSignal ?? 0;
    return posts
      .filter((p) => p.signalScore >= min)
      .sort((a, b) => {
        // Tailored ranking: signal first, then recency
        const s = b.signalScore - a.signalScore;
        if (Math.abs(s) > 8) return s;
        return b.postedAt - a.postedAt;
      })
      .slice(0, limit);
  },
});

export const listChannels = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const accounts = await ctx.db.query("xTrackedAccounts").collect();
    const channels = new Map<string, number>();
    for (const a of accounts) {
      if (!a.enabled) continue;
      channels.set(a.feedChannel, (channels.get(a.feedChannel) ?? 0) + 1);
    }
    return [...channels.entries()]
      .map(([channel, accountCount]) => ({ channel, accountCount }))
      .sort((a, b) => a.channel.localeCompare(b.channel));
  },
});

export const addAccount = mutation({
  args: {
    handle: v.string(),
    feedChannel: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const handle = normalizeHandle(args.handle);
    if (!isValidHandle(handle)) {
      throw new Error("Invalid X handle (1–15 letters, numbers, underscore)");
    }
    const existing = await ctx.db
      .query("xTrackedAccounts")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        feedChannel: (args.feedChannel ?? existing.feedChannel)
          .trim()
          .toLowerCase()
          .slice(0, 40) || "global",
        tags: (args.tags ?? existing.tags).map((t) => t.slice(0, 32)).slice(0, 12),
        displayName: args.displayName ?? existing.displayName,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert("xTrackedAccounts", {
      handle,
      displayName: args.displayName,
      tags: (args.tags ?? ["osint"]).map((t) => t.slice(0, 32)).slice(0, 12),
      enabled: true,
      feedChannel:
        (args.feedChannel ?? "global").trim().toLowerCase().slice(0, 40) ||
        "global",
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
  },
});

export const removeAccount = mutation({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const handle = normalizeHandle(args.handle);
    const existing = await ctx.db
      .query("xTrackedAccounts")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .unique();
    if (!existing) return { removed: false };
    await ctx.db.delete(existing._id);
    return { removed: true };
  },
});

export const setAccountEnabled = mutation({
  args: { handle: v.string(), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const handle = normalizeHandle(args.handle);
    const existing = await ctx.db
      .query("xTrackedAccounts")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .unique();
    if (!existing) throw new Error("Account not tracked");
    await ctx.db.patch(existing._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    let added = 0;
    for (const a of DEFAULT_X_OSINT_ACCOUNTS) {
      const existing = await ctx.db
        .query("xTrackedAccounts")
        .withIndex("by_handle", (q) => q.eq("handle", a.handle))
        .unique();
      if (existing) continue;
      await ctx.db.insert("xTrackedAccounts", {
        handle: a.handle,
        displayName: a.displayName,
        tags: a.tags,
        enabled: true,
        feedChannel: a.feedChannel,
        createdAt: now,
        updatedAt: now,
        createdByUserId: user._id,
      });
      added++;
    }
    return { added };
  },
});

/** Manual poll — rate limited per user. */
export const requestPoll = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const last = lastPollByUser.get(user.clerkUserId) ?? 0;
    if (now - last < RATE_MS) {
      throw new Error("X poll rate limited. Wait about a minute.");
    }
    lastPollByUser.set(user.clerkUserId, now);

    // Ensure at least default accounts exist
    const any = await ctx.db.query("xTrackedAccounts").take(1);
    if (any.length === 0) {
      for (const a of DEFAULT_X_OSINT_ACCOUNTS) {
        await ctx.db.insert("xTrackedAccounts", {
          handle: a.handle,
          displayName: a.displayName,
          tags: a.tags,
          enabled: true,
          feedChannel: a.feedChannel,
          createdAt: now,
          updatedAt: now,
          createdByUserId: user._id,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.providers.xFeedPoll.pollAll, {
      maxPerAccount: 15,
    });
    return { scheduled: true };
  },
});

// ——— Internal ———

export const listEnabledInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("xTrackedAccounts").collect();
    return all.filter((a) => a.enabled);
  },
});

export const upsertPosts = internalMutation({
  args: {
    posts: v.array(
      v.object({
        externalId: v.string(),
        handle: v.string(),
        authorName: v.optional(v.string()),
        text: v.string(),
        url: v.string(),
        postedAt: v.number(),
        feedChannel: v.string(),
        tags: v.array(v.string()),
        likeCount: v.optional(v.number()),
        repostCount: v.optional(v.number()),
        replyCount: v.optional(v.number()),
        signalScore: v.number(),
        inferredRegion: v.optional(v.string()),
        inferredLat: v.optional(v.number()),
        inferredLon: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    const now = Date.now();
    for (const p of args.posts) {
      const text = p.text.slice(0, 4000);
      const existing = await ctx.db
        .query("xPosts")
        .withIndex("by_externalId", (q) => q.eq("externalId", p.externalId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          text,
          likeCount: p.likeCount,
          repostCount: p.repostCount,
          replyCount: p.replyCount,
          signalScore: p.signalScore,
          inferredRegion: p.inferredRegion,
          inferredLat: p.inferredLat,
          inferredLon: p.inferredLon,
        });
        updated++;
      } else {
        await ctx.db.insert("xPosts", {
          ...p,
          text,
          createdAt: now,
        });
        created++;
      }
    }
    return { created, updated };
  },
});

export const markAccountPolled = internalMutation({
  args: {
    id: v.id("xTrackedAccounts"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastPolledAt: Date.now(),
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const patchAccountMeta = internalMutation({
  args: {
    id: v.id("xTrackedAccounts"),
    xUserId: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      xUserId: args.xUserId,
      displayName: args.displayName,
      updatedAt: Date.now(),
    });
  },
});

export const recordPollRun = internalMutation({
  args: {
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("running"),
    ),
    recordsReceived: v.number(),
    recordsCreated: v.number(),
    recordsUpdated: v.number(),
    errorSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("ingestionRuns", {
      provider: "x_osint",
      startedAt: now,
      completedAt: now,
      status: args.status,
      recordsReceived: args.recordsReceived,
      recordsCreated: args.recordsCreated,
      recordsUpdated: args.recordsUpdated,
      errorSummary: args.errorSummary,
    });
  },
});

export const ensureSeededInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const any = await ctx.db.query("xTrackedAccounts").take(1);
    if (any.length > 0) return { seeded: false };
    const now = Date.now();
    for (const a of DEFAULT_X_OSINT_ACCOUNTS) {
      await ctx.db.insert("xTrackedAccounts", {
        handle: a.handle,
        displayName: a.displayName,
        tags: a.tags,
        enabled: true,
        feedChannel: a.feedChannel,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { seeded: true };
  },
});

/** Upsert a single tracked handle (idempotent). Safe for CLI / agent seed. */
export const ensureAccountInternal = internalMutation({
  args: {
    handle: v.string(),
    feedChannel: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    displayName: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const handle = normalizeHandle(args.handle);
    if (!isValidHandle(handle)) {
      throw new Error(`Invalid handle: ${args.handle}`);
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("xTrackedAccounts")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .unique();
    const feedChannel =
      (args.feedChannel ?? "breaking").trim().toLowerCase().slice(0, 40) ||
      "breaking";
    const tags = (args.tags ?? ["osint"]).map((t) => t.slice(0, 32)).slice(0, 12);
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled ?? true,
        feedChannel,
        tags,
        displayName: args.displayName ?? existing.displayName,
        updatedAt: now,
      });
      return { id: existing._id, created: false };
    }
    const id = await ctx.db.insert("xTrackedAccounts", {
      handle,
      displayName: args.displayName,
      tags,
      enabled: args.enabled ?? true,
      feedChannel,
      createdAt: now,
      updatedAt: now,
    });
    return { id, created: true };
  },
});
