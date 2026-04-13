import { useCallback } from 'react';
import { getDirectionsCached } from '@/services/goongService';

/**
 * Shared hook for fire-and-forget route prefetching.
 * Warms the directions cache so that map components can render exact routes
 * instantly when the user selects a list item.
 *
 * Usage:
 *   const { prefetchRoute } = usePrefetchedDirectionsRoute(GOONG_API_KEY);
 *   prefetchRoute(origin, destination);
 */
export function usePrefetchedDirectionsRoute(apiKey: string) {
  const prefetchRoute = useCallback(
    (
      origin: { lat: number; lng: number } | null | undefined,
      destination: { lat: number; lng: number } | null | undefined,
    ) => {
      if (!apiKey || !origin || !destination) return;
      void getDirectionsCached(origin, destination, 'car', apiKey);
    },
    [apiKey],
  );

  return { prefetchRoute };
}
