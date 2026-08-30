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
    await expect(
      page.getByRole("link", { name: /request access/i }),
    ).toBeVisible();
  });

  test("request access requires personnel security attestation", async ({
    page,
  }) => {
    await page.goto("/waitlist");
    await expect(
      page.getByRole("heading", { name: /request access/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/significant background check/i)).toBeVisible();
    await expect(page.getByText(/gs-8/i)).toBeVisible();
    await expect(
      page.getByText(/signals division of the national security agency/i),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /i certify the statements above/i }),
    ).toBeVisible();
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
