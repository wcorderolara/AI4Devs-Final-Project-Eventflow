'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/shared/api-client';
import { handleQueryError } from '@/shared/auth-session';

// Devtools solo en dev, vía dynamic import (fuera del bundle de prod).
const ReactQueryDevtools =
  process.env.NODE_ENV !== 'production'
    ? dynamic(
        () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
        { ssr: false },
      )
    : () => null;

export function QueryProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  // Refs para que el `onError` (creado una sola vez) lea el valor actual sin closure obsoleto.
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Instancia única por request (patrón oficial App Router — evita shared state entre requests).
  const [queryClient] = useState(() => {
    let client: QueryClient;
    const queryCache = new QueryCache({
      onError: (error, query) => {
        handleQueryError(error, query, {
          queryClient: client,
          redirect: (to) => routerRef.current.replace(to),
          pathname: pathnameRef.current,
          search: typeof window !== 'undefined' ? window.location.search : '',
        });
      },
    });
    client = new QueryClient({
      queryCache,
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          retry: (failureCount, error) => {
            if (failureCount >= 1) return false;
            if (error instanceof ApiError) return error.isRetryable;
            return true;
          },
          retryDelay: 1_000,
        },
        mutations: { retry: 0 },
      },
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
