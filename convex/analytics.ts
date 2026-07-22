import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthedUser, requireIdentity } from "./lib/auth";

const ALLOWED = new Set([
  "dashboard_viewed",
  "filter_changed",
  "event_opened",
  "source_link_followed",
  "event_bookmarked",
  "refresh_requested",
]);

/** Store privacy-conscious product events (name + optional opaque meta JSON). */
export const track = mutation({
  args: {
    name: v.string(),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    if (!ALLOWED.has(args.name)) {
      throw new Error("Unknown analytics event");
    }
    // Cap meta size; never store free-text search or event bodies from clients intentionally.
    const meta = args.meta?.slice(0, 500);
    const user = await getAuthedUser(ctx);
    await ctx.db.insert("productEvents", {
      userId: user?._id,
      name: args.name,
      meta,
      createdAt: Date.now(),
    });
  },
});
