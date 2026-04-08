import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  reliefFulfillmentService,
  type CreateReliefFulfillmentPayload,
  type MarkReliefFulfillmentFailedPayload,
  type UpdateReliefFulfillmentProofPayload,
} from '@/services/reliefFulfillmentService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const RELIEF_FULFILLMENT_KEYS = {
  all: ['relief-fulfillments'] as const,
  byRequest: (requestId: string) => ['relief-fulfillments', 'by-request', requestId] as const,
  bySession: (sessionId: string) => ['relief-fulfillments', 'by-session', sessionId] as const,
};

export function useReliefFulfillmentsByRequest(requestId: string) {
  return useQuery({
    queryKey: RELIEF_FULFILLMENT_KEYS.byRequest(requestId),
    queryFn: async () => {
      const response = await reliefFulfillmentService.getByRequest(requestId);
      return response.data;
    },
    enabled: !!requestId,
  });
}

export function useReliefFulfillmentsBySession(sessionId: string) {
  return useQuery({
    queryKey: RELIEF_FULFILLMENT_KEYS.bySession(sessionId),
    queryFn: async () => {
      const response = await reliefFulfillmentService.getBySession(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
  });
}

export function useCreateReliefFulfillment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateReliefFulfillmentPayload }) =>
      reliefFulfillmentService.createBySession(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã tạo kết quả phát hàng');
      queryClient.invalidateQueries({
        queryKey: RELIEF_FULFILLMENT_KEYS.bySession(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: RELIEF_FULFILLMENT_KEYS.all });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể tạo kết quả phát hàng');
    },
  });
}

export function useUploadReliefFulfillmentProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReliefFulfillmentProofPayload }) =>
      reliefFulfillmentService.uploadProof(id, data),
    onSuccess: () => {
      toast.success('Đã cập nhật ảnh minh chứng phát hàng');
      queryClient.invalidateQueries({ queryKey: RELIEF_FULFILLMENT_KEYS.all });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể cập nhật ảnh minh chứng');
    },
  });
}

export function useMarkReliefFulfillmentFailed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkReliefFulfillmentFailedPayload }) =>
      reliefFulfillmentService.markFailed(id, data),
    onSuccess: () => {
      toast.success('Đã đánh dấu phát hàng thất bại');
      queryClient.invalidateQueries({ queryKey: RELIEF_FULFILLMENT_KEYS.all });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể đánh dấu phát hàng thất bại');
    },
  });
}
