import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, inventoryTransactionService } from '@/services/inventoryService';
import type {
  CreateInventoryPayload,
  UpdateInventoryPayload,
  SearchInventoryParams,
  CreateStockPayload,
  UpdateStockPayload,
  CreateTransactionPayload,
  SearchTransactionParams,
  SearchTransactionByTypeParams,
} from '@/services/inventoryService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const INVENTORY_KEYS = {
  all: ['inventories'] as const,
  list: (params?: SearchInventoryParams) => [...INVENTORY_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...INVENTORY_KEYS.all, 'detail', id] as const,
  stocks: (id: string, params?: any) => [...INVENTORY_KEYS.all, 'stocks', id, params] as const,
};

export const TRANSACTION_KEYS = {
  all: ['transactions'] as const,
  detail: (id: string) => [...TRANSACTION_KEYS.all, 'detail', id] as const,
  byInventory: (inventoryId: string, params?: any) =>
    [...TRANSACTION_KEYS.all, 'by-inventory', inventoryId, params] as const,
  byType: (params?: any) => [...TRANSACTION_KEYS.all, 'by-type', params] as const,
  importHistory: (inventoryId: string, supplyItemId: string) =>
    [...TRANSACTION_KEYS.all, 'import-history', inventoryId, supplyItemId] as const,
};

// --- Inventory Hooks ---

export function useInventories(params?: SearchInventoryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INVENTORY_KEYS.list(params),
    queryFn: async () => {
      const response = await inventoryService.getAll(params);
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useInventory(id: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.detail(id),
    queryFn: async () => {
      const response = await inventoryService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useInventoryStocks(id: string, params?: { pageIndex?: number; pageSize?: number }) {
  return useQuery({
    queryKey: INVENTORY_KEYS.stocks(id, params),
    queryFn: async () => {
      const response = await inventoryService.getStocks(id, params);
      return response.data;
    },
    enabled: !!id,
  });
}

// --- Transaction Hooks ---

export function useTransaction(id: string) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.detail(id),
    queryFn: async () => {
      const response = await inventoryTransactionService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useInventoryTransactions(inventoryId: string, params?: SearchTransactionParams) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.byInventory(inventoryId, params),
    queryFn: async () => {
      const response = await inventoryTransactionService.getByInventory(inventoryId, params);
      return response.data;
    },
    enabled: !!inventoryId,
  });
}

export function useTransactionsByType(params?: SearchTransactionByTypeParams) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.byType(params),
    queryFn: async () => {
      const response = await inventoryTransactionService.getByType(params);
      return response.data;
    },
  });
}

export function useImportHistoryBySupplyItem(inventoryId: string, supplyItemId: string) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.importHistory(inventoryId, supplyItemId),
    queryFn: async () => {
      const response = await inventoryTransactionService.getImportHistoryBySupplyItem(
        inventoryId,
        supplyItemId,
      );
      return response.data;
    },
    enabled: !!inventoryId && !!supplyItemId,
  });
}

// --- Mutations ---

export function useCreateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInventoryPayload) => inventoryService.create(data),
    onSuccess: () => {
      toast.success('Đã tạo kho thành công');
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo kho');
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryPayload }) =>
      inventoryService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật kho thành công');
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.detail(variables.id) });
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateStockPayload }) =>
      inventoryService.addStock(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm vật tư vào kho');
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stocks(variables.id) });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stockId,
      data,
    }: {
      stockId: string;
      inventoryId: string;
      data: UpdateStockPayload;
    }) => inventoryService.updateStock(stockId, data),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật mức tồn kho thành công');
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stocks(variables.inventoryId) });
    },
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockId }: { stockId: string; inventoryId: string }) =>
      inventoryService.deleteStock(stockId),
    onSuccess: (_, variables) => {
      toast.success('Đã xóa vật tư khỏi kho');
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stocks(variables.inventoryId) });
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionPayload) => inventoryTransactionService.create(data),
    onSuccess: (_, variables) => {
      toast.success('Giao dịch kho đã được thực hiện');
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stocks(variables.inventoryId) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể thực hiện giao dịch kho');
    },
  });
}
