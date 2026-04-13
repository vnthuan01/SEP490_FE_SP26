import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  rescueRequestService,
  type RejectRescueRequestPayload,
  type VerifyRescueRequestPayload,
} from '@/services/rescueRequestService';

export const RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS = {
  list: (pageNumber: number, pageSize: number) =>
    ['rescue-request-management', 'list', pageNumber, pageSize] as const,
};

const isEmergencyType = (value: unknown) => {
  if (typeof value === 'string') return value.trim().toLowerCase() === 'emergency';
  if (typeof value === 'number') return value === 1;
  return false;
};

export function useRescueRequestManagement(pageNumber = 1, pageSize = 10) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.list(pageNumber, pageSize),
    queryFn: async () => {
      // Lấy toàn bộ request rồi sắp xếp: Emergency trước, sau đó đến các request còn lại theo priority giảm dần
      const res = await rescueRequestService.getRequests(undefined, pageNumber, pageSize);
      const sortedItems = [...(res.items || [])].sort((a, b) => {
        const emergencyOrder =
          Number(isEmergencyType(b.rescueRequestType)) -
          Number(isEmergencyType(a.rescueRequestType));
        if (emergencyOrder !== 0) return emergencyOrder;

        return (Number(b.priority) || 0) - (Number(a.priority) || 0);
      });

      return {
        items: sortedItems,
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
        queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.list(pageNumber, pageSize),
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
        queryKey: RESCUE_REQUEST_MANAGEMENT_QUERY_KEYS.list(pageNumber, pageSize),
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
