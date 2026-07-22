import { mutation, query } from "./_generated/server";
import { getAuthedUser, requireUser } from "./lib/auth";

/** Ensure the current Clerk user has a local users row. */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return user;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthedUser(ctx);
  },
});
