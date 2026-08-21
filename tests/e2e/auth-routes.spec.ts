import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/",
  "/customers",
  "/bookings",
  "/rentals",
  "/payments",
  "/reports",
  "/service",
  "/settings",
];

test.describe("authentication route boundaries", () => {
  for (const route of protectedRoutes) {
    test(`redirects unauthenticated users from ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });

      await expect(page).toHaveURL((url) => {
        return url.pathname === "/login" && url.searchParams.get("next") === route;
      });
      await expect(page.getByText("Evo Rentals ERP", { exact: true })).toBeVisible();
    });
  }

  test("renders the login form without submitting credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  test("renders the password recovery request form without sending email", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "networkidle" });

    await expect(page.getByText("Reset your password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("keeps the password update screen protected without a recovery session", async ({ page }) => {
    await page.goto("/update-password", { waitUntil: "networkidle" });

    await expect(page).toHaveURL((url) => url.pathname === "/login");
    await expect(page.getByText("Evo Rentals ERP", { exact: true })).toBeVisible();
  });
});
