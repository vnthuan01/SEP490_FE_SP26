import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  normalizeSupplyItem,
  normalizeSupplyItemPage,
  supplyAllocationService,
  supplyItemService,
  type CreateSupplyAllocationPayload,
  type CreateSupplyItemPayload,
  type SearchSupplyAllocationByStatusParams,
  type SearchSupplyItemsParams,
  type UpdateSupplyAllocationStatusPayload,
  type UpdateSupplyItemPayload,
} from '@/services/supplyService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const SUPPLY_QUERY_KEYS = {
  all: ['supplies'] as const,
  items: (params?: SearchSupplyItemsParams) => ['supplies', 'items', params] as const,
  itemDetail: (id: string) => ['supplies', 'item-detail', id] as const,
  allocationsByCampaign: (campaignId: string) =>
    ['supplies', 'allocations', 'campaign', campaignId] as const,
  allocationsByInventory: (inventoryId: string) =>
    ['supplies', 'allocations', 'inventory', inventoryId] as const,
  allocationsByStatus: (params?: SearchSupplyAllocationByStatusParams) =>
    ['supplies', 'allocations', 'status', params] as const,
  allocationDetail: (id: string) => ['supplies', 'allocation-detail', id] as const,
};

export function useSupplyItems(params?: SearchSupplyItemsParams) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.items(params),
    queryFn: async () => {
      const response = await supplyItemService.getAll(params);
      return normalizeSupplyItemPage(response.data as any);
    },
  });
}

export function useSupplyItem(id: string) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.itemDetail(id),
    queryFn: async () => {
      const response = await supplyItemService.getById(id);
      return normalizeSupplyItem(response.data as any);
    },
    enabled: !!id,
  });
}

export function useCreateSupplyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplyItemPayload) => supplyItemService.create(data),
    onSuccess: () => {
      toast.success('Đã tạo hàng hóa cứu trợ');
      queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo hàng hóa cứu trợ');
    },
  });
}

export function useUpdateSupplyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyItemPayload }) =>
      supplyItemService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã cập nhật hàng hóa cứu trợ');
      queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.itemDetail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật hàng hóa cứu trợ');
    },
  });
}

export function useDeleteSupplyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supplyItemService.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa hàng hóa cứu trợ');
      queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể xóa hàng hóa cứu trợ');
    },
  });
}

export function useSupplyAllocation(id: string) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.allocationDetail(id),
    queryFn: async () => {
      const response = await supplyAllocationService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useSupplyAllocationsByCampaign(campaignId: string) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.allocationsByCampaign(campaignId),
    queryFn: async () => {
      const response = await supplyAllocationService.getByCampaign(campaignId);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

export function useSupplyAllocationsByInventory(inventoryId: string) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.allocationsByInventory(inventoryId),
    queryFn: async () => {
      const response = await supplyAllocationService.getByInventory(inventoryId);
      return response.data;
    },
    enabled: !!inventoryId,
  });
}

export function useSupplyAllocationsByStatus(params?: SearchSupplyAllocationByStatusParams) {
  return useQuery({
    queryKey: SUPPLY_QUERY_KEYS.allocationsByStatus(params),
    queryFn: async () => {
      const response = await supplyAllocationService.getByStatus(params);
      return response.data;
    },
  });
}

export function useCreateSupplyAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplyAllocationPayload) => supplyAllocationService.create(data),
    onSuccess: () => {
      toast.success('Đã tạo điều phối hàng hóa');
      queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo điều phối hàng hóa');
    },
  });
}

export function useUpdateSupplyAllocationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyAllocationStatusPayload }) =>
      supplyAllocationService.updateStatus(id, data),
    onSuccess: async (_, variables) => {
      toast.success('Đã cập nhật trạng thái điều phối');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SUPPLY_QUERY_KEYS.all }),
        queryClient.invalidateQueries({
          queryKey: SUPPLY_QUERY_KEYS.allocationDetail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: ['supplies', 'allocations'] }),
      ]);
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật trạng thái điều phối');
    },
  });
}
