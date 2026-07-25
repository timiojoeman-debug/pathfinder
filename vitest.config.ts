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
        // Measured at the time of writing: 47.54% lines, 44.60% statements,
        // 39.40% functions, 36.88% branches. These sit a whisker below that,
        // so coverage cannot silently regress while staying green today —
        // a threshold set to an aspirational 80% would fail on every run and
        // simply get ignored.
        //
        // Raise these as tests land. The whole non-UI codebase, the shared
        // primitives, and the first stateful panels (profile-research,
        // startup-panel, practice-panel) are now tested. The remaining gap is
        // the rest of the components/pf/** panels and the phase pages.
        lines: 47,
        statements: 44,
        functions: 39,
        branches: 36,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
