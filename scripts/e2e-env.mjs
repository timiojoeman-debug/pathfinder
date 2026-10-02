// Writes .env.e2e for the Playwright smoke tests from the LOCAL Supabase stack
// (`npm run db:start`). It never reads or copies .env.local: every key the app
// reads is set here explicitly, so a production value can't leak into a test
// run (Next.js does not override a variable that is already set, even to "").
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const raw = execSync("npx supabase status -o json", { encoding: "utf8" });
const s = JSON.parse(raw.slice(raw.indexOf("{")));
const url = s.API_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(`Refusing to write .env.e2e: Supabase API_URL is not local (${url})`);
}

const env = {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: s.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
  JWT_SECRET: randomBytes(32).toString("hex"),
  // Deliberately invalid: no test can make a real (billed) OpenAI call.
  OPENAI_API_KEY: "sk-e2e-invalid",
  NEXT_PUBLIC_OPENAI_API_KEY: "",
  // Off in e2e: no real email, no real job-board calls.
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  ADZUNA_APP_ID: "",
  ADZUNA_APP_KEY: "",
  NEXT_PUBLIC_APP_URL: "http://localhost:3210",
  LOG_LEVEL: "warn",
};
writeFileSync(".env.e2e", Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
console.log(`Wrote .env.e2e for local Supabase at ${url}`);
