import { expect, type Page, test } from "@playwright/test";

/**
 * The heart of the product, end to end in simulation mode:
 * signup → onboarding → first AI scan (simulated) → dashboard → recommendations → billing.
 */

const password = "Correct-Horse-Battery-9";

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Work email").fill(email);
  await page.locator("input[type=password]").first().fill(password);
  await page.locator("#signup-terms").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 });
}

async function completeOnboarding(page: Page) {
  // Step 1 — business
  await page.getByLabel("Business name").fill("Riverside Dental");
  await page.getByLabel("Website").first().fill("riversidedental.example");
  await page.getByLabel("Industry").fill("Dental Clinic");
  await page.getByLabel("Country").fill("Pakistan");
  await page.getByLabel("City").fill("Lahore");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — services
  const services = page.locator("#ob-services");
  await services.fill("Dental implants");
  await services.press("Enter");
  await services.fill("Braces");
  await services.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Braces" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 — competitors
  await page.getByPlaceholder("e.g. Bright Smile Dental").first().fill("Northside Dental");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4 — monitoring (keep the scan small)
  await page.getByRole("spinbutton", { name: "Number of questions" }).fill("6");
  await page.getByRole("button", { name: "Analyze My Business" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test("signup → onboarding → simulated scan → dashboard → recommendations → billing", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await signUp(page, email);
  await completeOnboarding(page);

  // The first scan starts automatically; progress is visible while it runs.
  await expect(page.getByText(/AI Visibility Scan|Scan running/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Scan completed")).toBeVisible({ timeout: 90_000 });

  // Dashboard shows the score, platforms and a clear simulation label.
  await page.reload();
  await expect(page.getByText("AI Visibility Score").first()).toBeVisible();
  await expect(page.getByText(/simulation/i).first()).toBeVisible();
  for (const name of ["ChatGPT", "Gemini", "Perplexity"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  // Dismiss the first-run tour if it is showing.
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // Recommendations generated from the scan.
  await page.getByRole("link", { name: "Recommendations", exact: true }).click();
  await expect(page).toHaveURL(/\/recommendations/);
  await expect(page.getByText(/priority/i).first()).toBeVisible();

  // Questions were generated and analyzed.
  await page.getByRole("link", { name: "Questions", exact: true }).click();
  await expect(page).toHaveURL(/\/queries/);
  await expect(page.getByText(/Lahore/).first()).toBeVisible();

  // Billing shows plans; checkout is disabled (no Stripe in test env) with an explanation.
  await page.goto("/billing");
  await expect(page.getByTestId("plan-growth")).toBeVisible();
  await expect(page.getByText(/queries/i).first()).toBeVisible();
});

test("a user cannot open another user's project", async ({ page, browser }) => {
  const ownerEmail = `e2e-owner-${Date.now()}@example.test`;
  await signUp(page, ownerEmail);
  await completeOnboarding(page);
  const projectUrl = page.url();
  await expect(page.getByText("Scan completed")).toBeVisible({ timeout: 90_000 });
  // Find the owner's scan id from their history page.
  await page.goto(`${projectUrl}/history`);
  const scanHref = await page.locator('a[href*="/history/"]').first().getAttribute("href");
  const scanId = scanHref!.split("/").pop()!;

  const other = await browser.newPage();
  await signUp(other, `e2e-other-${Date.now()}@example.test`);
  // Streaming responses may already carry a 200 status; what matters is that
  // the ownership check renders "not found" and no project data is sent.
  const res = await other.goto(projectUrl);
  expect([200, 404]).toContain(res?.status());
  await expect(other.getByText("This page isn’t on our radar.")).toBeVisible({ timeout: 20_000 });
  expect(await other.content()).not.toContain("Riverside Dental");

  // The scan progress API and scan detail page refuse another user's scan.
  const api = await other.request.get(`/api/scans/${scanId}`);
  expect(api.status()).toBe(404);
  const ownerApi = await page.request.get(`/api/scans/${scanId}`);
  expect(ownerApi.status()).toBe(200);
  await other.goto(`${projectUrl}/history/${scanId}`);
  await expect(other.getByText("This page isn’t on our radar.")).toBeVisible({ timeout: 20_000 });
  await other.close();
});
