'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { hydrateReadModel } from '@/lib/store';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
    // Hydrate the reactive read-model from the canonical localStorage store so
    // the dashboard reflects data entered on the tracker / jobs / cv pages.
    hydrateReadModel();
  }, [checkAuth]);

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
