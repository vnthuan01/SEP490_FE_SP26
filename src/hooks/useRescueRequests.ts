import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rescueRequestService,
  type CreateRescueRequestPayload,
  type GetRescueRequestsParams,
  type GetPendingRescueRequestsParams,
  type VerifyRescueRequestPayload,
} from '@/services/rescueRequestService';
import { toast } from 'sonner';

export const RESCUE_REQUEST_KEYS = {
  all: ['rescue-requests'] as const,
  list: (params: GetRescueRequestsParams) => [...RESCUE_REQUEST_KEYS.all, 'list', params] as const,
  pending: (params: GetPendingRescueRequestsParams) =>
    [...RESCUE_REQUEST_KEYS.all, 'pending', params] as const,
  detail: (id: string) => [...RESCUE_REQUEST_KEYS.all, 'detail', id] as const,
};

export const useRescueRequests = (params: GetRescueRequestsParams) => {
  return useQuery({
    queryKey: RESCUE_REQUEST_KEYS.list(params),
    queryFn: async () => {
      const response = await rescueRequestService.getAll(params);
      return response.data;
    },
  });
};

export const usePendingRescueRequests = (params: GetPendingRescueRequestsParams) => {
  return useQuery({
    queryKey: RESCUE_REQUEST_KEYS.pending(params),
    queryFn: async () => {
      const response = await rescueRequestService.getPendingList(params);
      return response.data;
    },
  });
};

export const useRescueRequest = (id: string) => {
  return useQuery({
    queryKey: RESCUE_REQUEST_KEYS.detail(id),
    queryFn: async () => {
      const response = await rescueRequestService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateRescueRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRescueRequestPayload) => rescueRequestService.create(data),
    onSuccess: () => {
      toast.success('Tạo yêu cầu cứu hộ thành công');
      queryClient.invalidateQueries({ queryKey: RESCUE_REQUEST_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu cứu hộ');
    },
  });
};

export const useVerifyRescueRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VerifyRescueRequestPayload }) =>
      rescueRequestService.verify(id, data),
    onSuccess: (_, { id }) => {
      toast.success('Xác minh yêu cầu cứu hộ thành công');
      queryClient.invalidateQueries({ queryKey: RESCUE_REQUEST_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: RESCUE_REQUEST_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xác minh yêu cầu');
    },
  });
};
