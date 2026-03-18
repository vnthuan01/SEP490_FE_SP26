import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  priorityCriteriaService,
  type CreatePriorityCriteriaPayload,
  type UpdatePriorityCriteriaPayload,
} from '@/services/priorityCriteriaService';
import { toast } from 'sonner';

export const PRIORITY_CRITERIA_KEYS = {
  all: ['priority-criteria'] as const,
  detail: (id: string) => [...PRIORITY_CRITERIA_KEYS.all, 'detail', id] as const,
};

export const usePriorityCriteriaList = () => {
  return useQuery({
    queryKey: PRIORITY_CRITERIA_KEYS.all,
    queryFn: async () => {
      const response = await priorityCriteriaService.getAll();
      return response.data;
    },
  });
};

export const usePriorityCriteria = (id: string) => {
  return useQuery({
    queryKey: PRIORITY_CRITERIA_KEYS.detail(id),
    queryFn: async () => {
      const response = await priorityCriteriaService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreatePriorityCriteria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePriorityCriteriaPayload) => priorityCriteriaService.create(data),
    onSuccess: () => {
      toast.success('Tạo tiêu chí ưu tiên thành công');
      queryClient.invalidateQueries({ queryKey: PRIORITY_CRITERIA_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo tiêu chí ưu tiên');
    },
  });
};

export const useUpdatePriorityCriteria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriorityCriteriaPayload }) =>
      priorityCriteriaService.update(id, data),
    onSuccess: (_, { id }) => {
      toast.success('Cập nhật tiêu chí ưu tiên thành công');
      queryClient.invalidateQueries({ queryKey: PRIORITY_CRITERIA_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PRIORITY_CRITERIA_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật tiêu chí');
    },
  });
};

export const useDeletePriorityCriteria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => priorityCriteriaService.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá (hoặc vô hiệu hoá) tiêu chí ưu tiên');
      queryClient.invalidateQueries({ queryKey: PRIORITY_CRITERIA_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xoá tiêu chí');
    },
  });
};
