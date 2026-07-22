import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent tooling vendored into the repo, not project source. Without these
    // `npm run lint` reported ~18k problems from other people's skill scripts
    // and drowned the ~30 real ones in src/.
    ".claude/**",
    ".agents/**",
    // Generated coverage report — not source.
    "coverage/**",
  ]),
]);

export default eslintConfig;
