import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("landing page communicates the core promise", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /does ai recommend your business/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /check my ai visibility/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view demo/i }).first()).toBeVisible();
    await expect(page).toHaveTitle(/AI/);
  });

  test("pricing lists all four plans", async ({ page }) => {
    await page.goto("/pricing");
    for (const plan of ["Starter", "Growth", "Pro", "Agency"]) {
      await expect(page.getByTestId(`plan-${plan.toLowerCase()}`)).toBeVisible();
    }
    await expect(page.getByText("$19").first()).toBeVisible();
    await page.getByRole("button", { name: /annual/i }).click();
    await expect(page.getByText(/billed yearly/i).first()).toBeVisible();
  });

  test("public demo is clearly labeled as simulated", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText(/demo data|simulated/i).first()).toBeVisible();
    await expect(page.getByText(/AI Visibility/i).first()).toBeVisible();
  });

  test("seo endpoints are served and private routes are disallowed", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/dashboard/);
    expect(robots).toMatch(/Sitemap:/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain("/pricing");
  });

  test("protected pages redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
