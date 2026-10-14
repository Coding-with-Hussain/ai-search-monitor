import { expect, test } from "@playwright/test";

/** Mobile layouts are designed, not shrunk: navigation collapses and nothing scrolls sideways. */

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("marketing pages fit the screen and the menu opens", async ({ page }) => {
  for (const path of ["/", "/pricing", "/features", "/free-ai-visibility-check", "/demo"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await page.goto("/");
  await page.getByRole("button", { name: /menu/i }).first().click();
  await expect(page.getByRole("link", { name: "Pricing" }).last()).toBeVisible();
});

test("signed-in app uses a collapsible navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(process.env.E2E_DEMO_EMAIL ?? "demo@aivisibility.dev");
  await page.locator("input[type=password]").first().fill(process.env.E2E_DEMO_PASSWORD ?? "demo-password-123");
  await page.getByRole("button", { name: /^sign in/i }).click();
  await page.waitForURL(/dashboard/);
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "Billing" })).toBeVisible();
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await noHorizontalScroll(page);
});
