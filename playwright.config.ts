import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

/**
 * End-to-end smoke tests against a production build wired to the LOCAL Supabase
 * stack. Run: `npm run db:start && npm run e2e:env && npm run test:e2e`.
 * .env.e2e is written by scripts/e2e-env.mjs and refuses a non-local database.
 */
function loadE2eEnv(): Record<string, string> {
  if (!existsSync(".env.e2e")) throw new Error("Missing .env.e2e: run `npm run db:start && npm run e2e:env` first");
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.e2e", "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const PORT = 3210;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { ...loadE2eEnv(), NODE_ENV: "production" },
  },
});
