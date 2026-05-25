import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute — prevents re-fetching on every render
      gcTime: 5 * 60 * 1000, // 5 minutes cache
      retry: (failureCount, error) => {
        // Exponential backoff for rate limit errors
        if (error?.message?.includes('rate limit') || error?.message?.includes('Rate limit') || error?.status === 429) {
          return failureCount < 3;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * Math.pow(2, attemptIndex), 30000),
    },
  },
});