'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { hydrateReadModel } from '@/lib/store';

/**
 * Pages that render nothing auth-dependent. The session check is skipped here:
 * these are the pages a logged-out visitor actually lands on, and asking
 * /api/auth/me on each one spent a request to be told "no session" and logged a
 * 401 in the console every time. The phase pages are deliberately not in this
 * list — they work logged-out but change what they offer once you are signed in.
 */
const NO_SESSION_NEEDED = new Set(['/', '/universities', '/privacy', '/terms']);

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const pathname = usePathname();

  useEffect(() => {
    if (!NO_SESSION_NEEDED.has(pathname)) checkAuth();
    // Hydrate the reactive read-model from the canonical localStorage store so
    // the dashboard reflects data entered on the tracker / jobs / cv pages.
    // Local only — no request — so it runs everywhere.
    hydrateReadModel();
  }, [checkAuth, pathname]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Intelligence Terminal mode is driven by data-theme (see ThemeController).
  // Legacy next-themes .dark is pinned to light until the marketing/phase pages
  // migrate to the semantic token system.
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>{children}</AuthInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
