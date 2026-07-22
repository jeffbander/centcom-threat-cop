import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthedUser, requireUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);
    if (!user) return [];

    const bms = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const events = [];
    for (const bm of bms) {
      const event = await ctx.db.get(bm.eventId);
      if (event) {
        events.push({
          ...event,
          bookmarkedAt: bm.createdAt,
          bookmarked: true,
        });
      }
    }
    return events;
  },
});

export const toggle = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_eventId", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }

    await ctx.db.insert("bookmarks", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});
