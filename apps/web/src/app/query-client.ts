import { QueryCache, QueryClient } from "@tanstack/react-query";

type QueryClientListeners = {
  onBackgroundError: (queryHash: string) => void;
  onQuerySuccess: (queryHash: string) => void;
};

export function createAppQueryClient({
  onBackgroundError,
  onQuerySuccess,
}: QueryClientListeners) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (query.state.data !== undefined) {
          onBackgroundError(query.queryHash);
        }
      },
      onSuccess: (_data, query) => onQuerySuccess(query.queryHash),
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60_000,
      },
    },
  });
}
