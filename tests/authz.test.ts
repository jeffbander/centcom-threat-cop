import { describe, expect, it } from "vitest";
import { AuthError, assertOwnUser } from "../convex/lib/auth";
import type { Id } from "../convex/_generated/dataModel";

describe("assertOwnUser", () => {
  it("allows matching ids", () => {
    const id = "jd7abc" as Id<"users">;
    expect(() => assertOwnUser(id, id)).not.toThrow();
  });

  it("rejects cross-user access", () => {
    const a = "jd7aaa" as Id<"users">;
    const b = "jd7bbb" as Id<"users">;
    expect(() => assertOwnUser(a, b)).toThrow(AuthError);
  });
});
