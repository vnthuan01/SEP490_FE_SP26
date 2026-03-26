import { apiClient } from '@/lib/apiClients';

// --- Inventory Interfaces ---

export interface Inventory {
  inventoryId: string;
  reliefStationId: string;
  level: number;
  status: number;
}

export interface CreateInventoryPayload {
  reliefStationId: string;
  level: number;
  status: number;
}

export interface UpdateInventoryPayload {
  level: number;
  status: number;
}

export interface SearchInventoryParams {
  reliefStationId?: string;
  level?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

// --- Stock Interfaces ---

export interface Stock {
  stockId: string;
  inventoryId: string;
  supplyItemId: string;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
}

export interface CreateStockPayload {
  supplyItemId: string;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
}

export interface UpdateStockPayload {
  minimumStockLevel: number;
  maximumStockLevel: number;
}

// --- Transaction Interfaces ---

export interface TransactionItem {
  supplyItemId: string;
  quantity: number;
  notes: string;
}

export interface CreateTransactionPayload {
  inventoryId: string;
  type: number;
  reason: number;
  notes: string;
  items: TransactionItem[];
}

export interface InventoryTransaction {
  transactionId: string;
  inventoryId: string;
  type: number;
  reason: number;
  notes: string;
  createdAt: string;
  items: any[];
}

export interface SearchTransactionParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface SearchTransactionByTypeParams extends SearchTransactionParams {
  type?: number;
  inventoryId?: string;
}

// --- Services ---

export const inventoryService = {
  // Inventory APIs
  create: (data: CreateInventoryPayload) => apiClient.post<Inventory>('/Inventory', data),

  getAll: (params?: SearchInventoryParams) =>
    apiClient.get<PaginatedResponse<Inventory>>('/Inventory', { params }),

  getById: (id: string) => apiClient.get<Inventory>(`/Inventory/${id}`),

  update: (id: string, data: UpdateInventoryPayload) =>
    apiClient.put<Inventory>(`/Inventory/${id}`, data),

  delete: (id: string) => apiClient.delete(`/Inventory/${id}`),

  // Stock APIs
  getStocks: (id: string, params?: { pageIndex?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<Stock>>(`/Inventory/${id}/stocks`, { params }),

  addStock: (id: string, data: CreateStockPayload) =>
    apiClient.post<Stock>(`/Inventory/${id}/stocks`, data),

  updateStock: (stockId: string, data: UpdateStockPayload) =>
    apiClient.put<Stock>(`/Inventory/stocks/${stockId}`, data),

  deleteStock: (stockId: string) => apiClient.delete(`/Inventory/stocks/${stockId}`),
};

export const inventoryTransactionService = {
  create: (data: CreateTransactionPayload) =>
    apiClient.post<InventoryTransaction>('/InventoryTransaction', data),

  getById: (id: string) => apiClient.get<InventoryTransaction>(`/InventoryTransaction/${id}`),

  getByInventory: (inventoryId: string, params?: SearchTransactionParams) =>
    apiClient.get<PaginatedResponse<InventoryTransaction>>(
      `/InventoryTransaction/by-inventory/${inventoryId}`,
      { params },
    ),

  getByType: (params?: SearchTransactionByTypeParams) =>
    apiClient.get<PaginatedResponse<InventoryTransaction>>('/InventoryTransaction/by-type', {
      params,
    }),
};
