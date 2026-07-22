import { test, expect } from "@playwright/test";

test.describe("Landing and auth gate", () => {
  test("unauthenticated user sees product landing", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /one screen for significant global events/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /sign in to open the console/i }),
    ).toBeVisible();
    await expect(page.getByText(/not an emergency alerting system/i)).toBeVisible();
  });

  test("bookmarks requires sign-in for unauthenticated users", async ({
    page,
  }) => {
    // Middleware may redirect to Clerk; accept either sign-in UI or our gate.
    await page.goto("/bookmarks");
    await expect(
      page
        .getByText(/sign in to view bookmarks/i)
        .or(page.getByText(/sign in/i).first()),
    ).toBeVisible({ timeout: 30_000 });
  });
});
