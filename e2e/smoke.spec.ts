import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests: the paths a student actually takes, against a production build
 * and a local Supabase stack. OPENAI_API_KEY is deliberately invalid, so any
 * real AI call fails (and costs nothing); AI success paths are stubbed per test.
 */

const uniqueEmail = () => `e2e+${Date.now()}${Math.floor(Math.random() * 1e4)}@example.test`;
const PASSWORD = "e2e-Passw0rd!";

async function signUp(page: Page, email = uniqueEmail()) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByPlaceholder("you@university.ac.uk").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /Create account →/ }).click();
  await expect(page).toHaveURL(/\/intel/);
  return email;
}

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@university.ac.uk").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /Sign in →/ }).click();
}

async function pickDirection(page: Page) {
  await page.goto("/direction");
  await page.getByRole("button", { name: "Full-Stack", exact: true }).click();
  await page.getByRole("button", { name: "Fintech", exact: true }).click();
  await page.getByRole("button", { name: "Scaleups", exact: true }).click();
  await page.getByRole("button", { name: /Generate statement/ }).click();
}

test("logged out: onboarding works and AI generators ask to sign in", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: "Full-Stack", exact: true }).click();
  await page.getByRole("button", { name: "Fintech", exact: true }).click();
  await page.getByRole("button", { name: "Scaleups", exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  for (const answer of ["Solid draft", "A couple built", "A few contacts", "Some weeks"]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByRole("button", { name: /Calculate my readiness/ }).click();
  await expect(page.getByText("Your pillars")).toBeVisible();

  // Direction composes locally without an account, and offers the AI only with sign-in.
  await pickDirection(page);
  await expect(page.getByText("Drafted locally").first()).toBeVisible();
  await page.getByRole("button", { name: /Sharpen with AI/ }).click();
  await expect(page.getByText(/sign in/i).first()).toBeVisible();
});

test("signed in: an AI failure is labelled, never passed off as AI", async ({ page }) => {
  await signUp(page);
  await pickDirection(page);
  // The real route runs with an invalid key, so it must fall back and say so.
  await expect(page.getByText("Drafted locally").first()).toBeVisible();
  await expect(page.getByText("AI draft")).toHaveCount(0);
});

test("signed in: a successful AI answer renders as an AI draft", async ({ page }) => {
  await signUp(page);
  await page.route("**/api/direction", (route) =>
    route.fulfill({
      json: { source: "ai", statement: "E2E stub: payments backend internships at fintech scaleups.", specificity: "High specificity", suggestions: [] },
    }),
  );
  await pickDirection(page);
  await expect(page.getByText("E2E stub: payments backend internships")).toBeVisible();
  await expect(page.getByText("AI draft").first()).toBeVisible();
});

test("account lifecycle: work syncs to a second device, exports, and deletes", async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  const email = await signUp(page);

  await page.goto("/tracker");
  const form = page.getByRole("form", { name: "Add an application" });
  await form.getByPlaceholder("Company").fill("E2E Sync Co");
  await form.getByPlaceholder("Role").fill("Backend Intern");
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("E2E Sync Co").first()).toBeVisible();
  // Sync is debounced (1.5s); wait for the snapshot to reach the server.
  await page.waitForResponse((r) => r.url().endsWith("/api/profile") && r.request().method() === "POST", { timeout: 15_000 });

  // A fresh device: empty local state, same account, so it hydrates from the server.
  const second = await browser.newContext();
  const other = await second.newPage();
  await logIn(other, email);
  await expect(other).toHaveURL(/\/intel/);
  await other.goto("/tracker");
  await expect(other.getByText("E2E Sync Co").first()).toBeVisible({ timeout: 15_000 });

  // Export returns the student's data.
  const exported = await other.request.get("/api/account/export");
  expect(exported.ok()).toBeTruthy();
  expect(await exported.text()).toContain("E2E Sync Co");

  // Delete, then the account is gone.
  await other.goto("/settings");
  await other.getByRole("button", { name: "Delete account" }).click();
  await other.getByPlaceholder("DELETE").fill("DELETE");
  await other.getByRole("button", { name: "Delete forever" }).click();
  await other.waitForURL((u) => !u.pathname.startsWith("/settings"), { timeout: 15_000 });

  const third = await browser.newContext();
  const check = await third.newPage();
  await logIn(check, email);
  await expect(check.getByText(/invalid|incorrect|not found|wrong/i).first()).toBeVisible();

  await Promise.all([first.close(), second.close(), third.close()]);
});
