import { useQuery } from '@tanstack/react-query';
import { rescueRequestService } from '@/services/rescueRequestService';

export const RESCUE_REQUEST_QUERY_KEYS = {
  list: (pageNumber: number, pageSize: number, statusFilter: number) =>
    ['rescue-requests', pageNumber, pageSize, statusFilter] as const,
};

interface UseRescueRequestsOptions {
  pageNumber?: number;
  pageSize?: number;
  statusFilter?: number;
}

export function useRescueRequests(options: UseRescueRequestsOptions = {}) {
  const { pageNumber = 1, pageSize = 10, statusFilter = 0 } = options;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: RESCUE_REQUEST_QUERY_KEYS.list(pageNumber, pageSize, statusFilter),
    queryFn: () => rescueRequestService.getRequests(statusFilter, pageNumber, pageSize),
  });

  return {
    requests: data?.items ?? [],
    paging: data?.paging ?? null,
    isLoading,
    isError,
    refetch,
  };
}
