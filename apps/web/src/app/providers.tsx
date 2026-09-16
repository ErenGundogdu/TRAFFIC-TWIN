"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { ThemeProvider } from "@/shared/theme";
import { BackgroundQueryErrorNotice } from "@/shared/ui";

import { createAppQueryClient } from "./query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  const [failedQueryHashes, setFailedQueryHashes] = useState<Set<string>>(
    () => new Set(),
  );
  const [queryClient] = useState(() =>
    createAppQueryClient({
      onBackgroundError: (queryHash) => {
        setFailedQueryHashes((current) => {
          if (current.has(queryHash)) return current;

          const next = new Set(current);
          next.add(queryHash);
          return next;
        });
      },
      onQuerySuccess: (queryHash) => {
        setFailedQueryHashes((current) => {
          if (!current.has(queryHash)) return current;

          const next = new Set(current);
          next.delete(queryHash);
          return next;
        });
      },
    }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {failedQueryHashes.size > 0 ? (
          <BackgroundQueryErrorNotice
            onDismiss={() => setFailedQueryHashes(new Set())}
          />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
