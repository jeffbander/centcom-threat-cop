import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthedUser, requireUser } from "./lib/auth";
import {
  isCategory,
  isPreferredView,
  isTimeWindow,
} from "./lib/constants";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);
    if (!user) return null;
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    return prefs;
  },
});

export const save = mutation({
  args: {
    selectedCategories: v.array(v.string()),
    selectedRegions: v.array(v.string()),
    timeWindow: v.string(),
    preferredView: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (!isTimeWindow(args.timeWindow)) {
      throw new Error("Invalid time window");
    }
    if (!isPreferredView(args.preferredView)) {
      throw new Error("Invalid preferred view");
    }
    const selectedCategories = args.selectedCategories.filter(isCategory);
    // Regions are free-form labels from allowlisted UI set; cap length.
    const selectedRegions = args.selectedRegions
      .map((r) => r.slice(0, 80))
      .slice(0, 20);

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();
    if (existing) {
      // Owner-only: index is by this user.
      await ctx.db.patch(existing._id, {
        selectedCategories,
        selectedRegions,
        timeWindow: args.timeWindow,
        preferredView: args.preferredView,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", {
      userId: user._id,
      selectedCategories,
      selectedRegions,
      timeWindow: args.timeWindow,
      preferredView: args.preferredView,
      updatedAt: now,
    });
  },
});
