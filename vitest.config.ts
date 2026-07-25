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
        // Measured at the time of writing: 44.92% lines, 42.17% statements,
        // 36.58% functions, 33.33% branches. These sit a whisker below that,
        // so coverage cannot silently regress while staying green today —
        // a threshold set to an aspirational 80% would fail on every run and
        // simply get ignored.
        //
        // Raise these as tests land. Every API route handler, the whole
        // Career-OS derivation layer, both Zustand store families, and the AI
        // engine/retrieval layer now have tests. The biggest remaining gap is
        // the React phase pages / components (untested — RTL territory).
        lines: 44,
        statements: 42,
        functions: 36,
        branches: 33,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
