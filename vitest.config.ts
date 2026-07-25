import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
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
        // Measured at the time of writing: 33.54% lines, 31.25% statements,
        // 22.80% functions, 24.55% branches. These sit a whisker below that,
        // so coverage cannot silently regress while staying green today —
        // a threshold set to an aspirational 80% would fail on every run and
        // simply get ignored.
        //
        // Raise these as tests land. Nearly every route handler now has tests
        // (remaining: cv/analyze, jobs/search internals, direction/{explore,
        // title-variants}). The biggest gaps are now non-route: lib/pf/store.ts
        // (~15%), lib/stores (0%), lib/ai/{mentor-engine,retrieval} (0%), and
        // the phase pages.
        lines: 33,
        statements: 31,
        functions: 22,
        branches: 24,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
