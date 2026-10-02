import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    // Only this checkout's own tests. Agent worktrees live under .claude/ (ESLint ignores
    // them too); without this, a local run also executes every other branch's suite.
    exclude: ['**/node_modules/**', '.claude/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // `include` governs what is counted, so untested modules still appear
      // at 0% instead of vanishing and flattering the total. (Vitest 4
      // dropped the old `all` flag; this is the replacement.)
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**', // type declarations only — no runtime to cover
        'src/**/*.d.ts',
        // Next.js file conventions: framework wiring with no branching logic.
        'src/app/**/layout.tsx',
        'src/middleware.ts',
      ],
      thresholds: {
        // A ratchet, not the goal.
        //
        // Measured at the time of writing: 54.49% lines, 51.19% statements,
        // 47.21% functions, 45.42% branches. These sit a whisker below that,
        // so coverage cannot silently regress while staying green today —
        // a threshold set to an aspirational 80% would fail on every run and
        // simply get ignored.
        //
        // Raise these as tests land. The whole non-UI codebase and every
        // stateful components/pf/** panel now have tests. The remaining gap is
        // the phase-page shells (src/app/**/page.tsx) and the layout chrome
        // (shell, journey, drawers).
        lines: 54,
        statements: 51,
        functions: 47,
        branches: 45,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
