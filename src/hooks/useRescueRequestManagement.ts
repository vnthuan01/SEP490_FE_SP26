import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  rescueRequestService,
  type RejectRescueRequestPayload,
  type VerifyRescueRequestPayload,
} from '@/services/rescueRequestService';

export const RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS = {
  normalPending: (pageNumber: number, pageSize: number) =>
    ['rescue-request-management', 'normal-pending', pageNumber, pageSize] as const,
};

const isNormalType = (value: unknown) => {
  if (typeof value === 'string') return value.trim().toLowerCase() === 'normal';
  if (typeof value === 'number') return value === 0;
  return false;
};

export function useRescueRequestManagement(pageNumber = 1, pageSize = 10) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.normalPending(pageNumber, pageSize),
    queryFn: async () => {
      // Lấy toàn bộ request rồi lọc Normal ở FE để thấy cả Pending/Approved/Rejected
      const res = await rescueRequestService.getRequests(undefined, pageNumber, pageSize);
      const normalItems = (res.items || []).filter((item) => isNormalType(item.rescueRequestType));
      return {
        items: normalItems,
        paging: res.paging,
      };
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: VerifyRescueRequestPayload;
    }) => rescueRequestService.verifyRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.normalPending(pageNumber, pageSize),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: RejectRescueRequestPayload;
    }) =>
      rescueRequestService.verifyRequest(requestId, {
        status: 2,
        method: payload.method,
        note: payload.note,
        reason: payload.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.normalPending(pageNumber, pageSize),
      });
    },
  });

  return {
    requests: data?.items || [],
    paging: data?.paging || null,
    isLoading,
    isError,
    refetch,
    verifyRequest: verifyMutation.mutateAsync,
    verifyStatus: verifyMutation.status,
    rejectRequest: rejectMutation.mutateAsync,
    rejectStatus: rejectMutation.status,
  };
}
