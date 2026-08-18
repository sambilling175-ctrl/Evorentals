import { expect, test } from "@playwright/test";

test.describe("authentication recovery safety", () => {
  test("redirects an unauthenticated protected route to sign in", async ({ page }) => {
    await page.goto("/rentals");

    await expect(page).toHaveURL(/\/login\?next=%2Frentals$/);
    await expect(page.getByText("Evo Rentals ERP", { exact: true })).toBeVisible();
  });

  test("keeps password recovery public and exposes its request form", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText("Reset your password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled();
  });

  test("rejects an invalid recovery callback without honoring an external next URL", async ({ page }) => {
    await page.goto("/auth/callback?next=https%3A%2F%2Fevil.example");

    await expect(page).toHaveURL(/\/forgot-password\?error=/);
    await expect(page.locator("p[role='alert']")).toContainText("Reset link is invalid or has expired");
  });

  test("forwards fallback recovery fragments to the callback and surfaces the invalid-link state", async ({ page }) => {
    await page.goto("/login#type=recovery");

    await expect(page).toHaveURL(/\/forgot-password\?error=/);
    await expect(page.locator("p[role='alert']")).toContainText("Reset link is invalid or has expired");
  });
});
