import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  distributionSessionService,
  type CreateDistributionSessionPayload,
  type DistributionSessionItemPayload,
  type DistributionSessionRequestPayload,
  type SearchDistributionSessionsParams,
} from '@/services/distributionSessionService';
import { toast } from 'sonner';

export const DISTRIBUTION_SESSION_KEYS = {
  all: ['distribution-sessions'] as const,
  list: (params?: SearchDistributionSessionsParams) =>
    ['distribution-sessions', 'list', params] as const,
  detail: (id: string) => ['distribution-sessions', 'detail', id] as const,
};

export function useCreateDistributionSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDistributionSessionPayload) => distributionSessionService.create(data),
    onSuccess: () => {
      toast.success('Đã tạo phiên phân phát');
      queryClient.invalidateQueries({ queryKey: DISTRIBUTION_SESSION_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Tạo phiên phân phát thất bại');
    },
  });
}

export function useDistributionSessions(params?: SearchDistributionSessionsParams) {
  return useQuery({
    queryKey: DISTRIBUTION_SESSION_KEYS.list(params),
    queryFn: async () => {
      const response = await distributionSessionService.getAll(params);
      return response.data;
    },
  });
}

export function useDistributionSession(id: string) {
  return useQuery({
    queryKey: DISTRIBUTION_SESSION_KEYS.detail(id),
    queryFn: async () => {
      const response = await distributionSessionService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAddDistributionSessionItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DistributionSessionItemPayload[] }) =>
      distributionSessionService.addItems(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm vật phẩm vào phiên phân phát');
      queryClient.invalidateQueries({ queryKey: DISTRIBUTION_SESSION_KEYS.detail(variables.id) });
    },
  });
}

export function useAddDistributionSessionRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DistributionSessionRequestPayload[] }) =>
      distributionSessionService.addRequests(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm yêu cầu vào phiên phân phát');
      queryClient.invalidateQueries({ queryKey: DISTRIBUTION_SESSION_KEYS.detail(variables.id) });
    },
  });
}

function createSessionActionMutation(
  mutationFn: (id: string) => Promise<any>,
  successMessage: string,
) {
  return function useSessionActionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => mutationFn(id),
      onSuccess: (_, id) => {
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: DISTRIBUTION_SESSION_KEYS.all });
        queryClient.invalidateQueries({ queryKey: DISTRIBUTION_SESSION_KEYS.detail(id) });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Cập nhật phiên phân phát thất bại');
      },
    });
  };
}

export const useReadyDistributionSession = createSessionActionMutation(
  distributionSessionService.ready,
  'Phiên phân phát đã sẵn sàng',
);
export const useStartDistributionSession = createSessionActionMutation(
  distributionSessionService.start,
  'Phiên phân phát đã bắt đầu',
);
export const useCompleteDistributionSession = createSessionActionMutation(
  distributionSessionService.complete,
  'Phiên phân phát đã hoàn thành',
);
export const useCancelDistributionSession = createSessionActionMutation(
  distributionSessionService.cancel,
  'Phiên phân phát đã bị huỷ',
);
