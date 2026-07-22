import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/** Resolve the authenticated Clerk identity. Fail closed if missing. */
export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new AuthError("Authentication required");
  }
  return identity;
}

/** Get or create the local users row for the authenticated Clerk subject. */
export async function requireUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const clerkUserId = identity.subject;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();

  const now = Date.now();
  const displayName =
    identity.name?.trim() ||
    identity.nickname?.trim() ||
    identity.email?.split("@")[0] ||
    "Operator";
  const email = identity.email ?? undefined;

  if (existing) {
    if (
      existing.displayName !== displayName ||
      existing.email !== email
    ) {
      await ctx.db.patch(existing._id, {
        displayName,
        email,
        updatedAt: now,
      });
      return { ...existing, displayName, email, updatedAt: now };
    }
    return existing;
  }

  const id = await ctx.db.insert("users", {
    clerkUserId,
    displayName,
    email,
    createdAt: now,
    updatedAt: now,
  });
  const user = await ctx.db.get(id);
  if (!user) throw new AuthError("Failed to create user");
  return user;
}

/** Read-only path: resolve user without creating. */
export async function getAuthedUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireAuthedUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getAuthedUser(ctx);
  if (!user) throw new AuthError("Authentication required");
  return user;
}

export function assertOwnUser(
  userId: Id<"users">,
  ownerId: Id<"users">,
): void {
  if (userId !== ownerId) {
    throw new AuthError("Forbidden");
  }
}
