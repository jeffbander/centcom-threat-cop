import { test, expect } from "@playwright/test";

test.describe("Landing and auth gate", () => {
  test("unauthenticated user sees product landing", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /threat common operating picture/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/u\.s\. government information system/i),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: /central command/i })).toHaveCount(
      1,
    );
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
