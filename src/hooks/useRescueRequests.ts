import { useQuery } from '@tanstack/react-query';
import { rescueRequestService } from '@/services/rescueRequestService';

export const RESCUE_REQUEST_QUERY_KEYS = {
  list: (pageNumber: number, pageSize: number, statusFilter: number, scope: 'all' | 'my-station') =>
    ['rescue-requests', scope, pageNumber, pageSize, statusFilter] as const,
};

interface UseRescueRequestsOptions {
  pageNumber?: number;
  pageSize?: number;
  statusFilter?: number;
  scope?: 'all' | 'my-station';
  enabled?: boolean;
}

export function useRescueRequests(options: UseRescueRequestsOptions = {}) {
  const {
    pageNumber = 1,
    pageSize = 10,
    statusFilter = 0,
    scope = 'all',
    enabled = true,
  } = options;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: RESCUE_REQUEST_QUERY_KEYS.list(pageNumber, pageSize, statusFilter, scope),
    queryFn: () =>
      scope === 'my-station'
        ? rescueRequestService.getMyStationRequests({ statusFilter, pageNumber, pageSize })
        : rescueRequestService.getRequests(statusFilter, pageNumber, pageSize),
    enabled,
  });

  return {
    requests: data?.items ?? [],
    paging: data?.paging ?? null,
    isLoading,
    isError,
    refetch,
  };
}
