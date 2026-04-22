import { apiClient } from '@/lib/apiClients';

// --- Inventory Interfaces ---

export interface Inventory {
  inventoryId: string;
  reliefStationId: string;
  reliefStationName: string;
  levelName: string;
  statusName: string;
  totalStockSlots: number;
  criticalCount: number;
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
  inventoryStockId?: string;
  inventoryId: string;
  supplyItemId: string;
  supplyItemName: string;
  supplyItemUnit: string;
  supplyItemCategory: number;
  supplyItemCategoryName: string;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  stockStatus: number;
  stockStatusName: string;
  fillPercentage: number;
  /** Optional – backend may or may not include this field */
  expirationDate?: string | null;
}

type RawStock = {
  inventoryStockId?: string;
  id?: string;
  stockId?: string;
  supplyStockId?: string;
  inventoryId?: string;
  supplyItemId?: string;
  supplyItemName?: string;
  supplyItemUnit?: string;
  supplyItemCategory?: number;
  supplyItemCategoryName?: string;
  currentQuantity?: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  stockStatus?: number;
  stockStatusName?: string;
  fillPercentage?: number;
  expirationDate?: string | null;
};

export interface CreateStockPayload {
  supplyItemId: string;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  expirationDate?: string | null;
}

export interface UpdateStockPayload {
  minimumStockLevel: number;
  maximumStockLevel: number;
}

function mapStock(raw: RawStock): Stock {
  return {
    stockId: raw.inventoryStockId || raw.stockId || raw.id || raw.supplyStockId || '',
    inventoryStockId: raw.inventoryStockId || raw.stockId || raw.id || raw.supplyStockId || '',
    inventoryId: raw.inventoryId || '',
    supplyItemId: raw.supplyItemId || '',
    supplyItemName: raw.supplyItemName || '',
    supplyItemUnit: raw.supplyItemUnit || '',
    supplyItemCategory: Number(raw.supplyItemCategory || 0),
    supplyItemCategoryName: raw.supplyItemCategoryName || '',
    currentQuantity: Number(raw.currentQuantity || 0),
    minimumStockLevel: Number(raw.minimumStockLevel || 0),
    maximumStockLevel: Number(raw.maximumStockLevel || 0),
    stockStatus: Number(raw.stockStatus || 0),
    stockStatusName: raw.stockStatusName || '',
    fillPercentage: Number(raw.fillPercentage || 0),
    expirationDate: raw.expirationDate ?? null,
  };
}

function mapStocks(raw: RawStock[] | PaginatedResponse<RawStock>): PaginatedResponse<Stock> {
  if (Array.isArray(raw)) {
    return {
      currentPage: 1,
      totalPages: 1,
      pageSize: raw.length,
      totalCount: raw.length,
      hasPrevious: false,
      hasNext: false,
      items: raw.map(mapStock),
    };
  }
  return {
    ...raw,
    items: (raw.items || []).map(mapStock),
  };
}

// --- Transaction Interfaces ---

export interface TransactionItem {
  transactionItemId?: string;
  supplyItemId: string;
  supplyItemName: string;
  supplyItemUnit: string;
  quantity: number;
  notes: string;
  unitCost?: number;
  expiryDate?: string | null;
}

export interface CreateTransactionPayload {
  inventoryId: string;
  type: number;
  reason: number;
  notes: string;
  importBatchCode?: string;
  sourceReference?: string;
  items: TransactionItem[];
  /** Optional link to a supply transfer (used for SupplyTransferOut/In transactions) */
  supplyTransferId?: string;
}

export interface InventoryTransaction {
  transactionId: string;
  inventoryId: string;
  reliefStationName?: string;
  transactionCode?: string;
  type: number;
  typeName?: string;
  reason: number;
  reasonName?: string;
  totalItems?: number;
  notes: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  importBatchCode?: string;
  sourceReference?: string;
  items: TransactionItem[];
}

export interface SearchTransactionParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface SearchTransactionByTypeParams extends SearchTransactionParams {
  type?: number;
  inventoryId?: string;
}

type RawTransactionItem = {
  transactionItemId?: string;
  supplyItemId?: string;
  supplyItemName?: string;
  supplyItemUnit?: string;
  quantity?: number;
  notes?: string;
  unitCost?: number;
  expiryDate?: string | null;
};

type RawInventoryTransaction = {
  transactionId?: string;
  inventoryId?: string;
  reliefStationName?: string;
  transactionCode?: string;
  type?: number;
  typeName?: string;
  reason?: number;
  reasonName?: string;
  totalItems?: number;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string;
  importBatchCode?: string;
  sourceReference?: string;
  items?: RawTransactionItem[];
};

function mapTransactionItem(raw: RawTransactionItem): TransactionItem {
  return {
    transactionItemId: raw.transactionItemId,
    supplyItemId: raw.supplyItemId || '',
    supplyItemName: raw.supplyItemName || '',
    supplyItemUnit: raw.supplyItemUnit || '',
    quantity: Number(raw.quantity || 0),
    notes: raw.notes || '',
    unitCost: raw.unitCost != null ? Number(raw.unitCost) : undefined,
    expiryDate: raw.expiryDate ?? null,
  };
}

function mapTransaction(raw: RawInventoryTransaction): InventoryTransaction {
  return {
    transactionId: raw.transactionId || '',
    inventoryId: raw.inventoryId || '',
    reliefStationName: raw.reliefStationName,
    transactionCode: raw.transactionCode,
    type: Number(raw.type || 0),
    typeName: raw.typeName,
    reason: Number(raw.reason || 0),
    reasonName: raw.reasonName,
    totalItems: raw.totalItems,
    notes: raw.notes || '',
    createdAt: raw.createdAt || '',
    createdBy: raw.createdBy,
    createdByName: raw.createdByName,
    importBatchCode: raw.importBatchCode,
    sourceReference: raw.sourceReference,
    items: (raw.items || []).map(mapTransactionItem),
  };
}

function mapTransactions(
  raw: PaginatedResponse<RawInventoryTransaction> | RawInventoryTransaction[],
): PaginatedResponse<InventoryTransaction> | InventoryTransaction[] {
  if (Array.isArray(raw)) return raw.map(mapTransaction);
  return {
    ...raw,
    items: (raw.items || []).map(mapTransaction),
  };
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

  // Stock APIs
  getStocks: (id: string, params?: { pageIndex?: number; pageSize?: number }) =>
    apiClient
      .get<PaginatedResponse<RawStock> | RawStock[]>(`/Inventory/${id}/stocks`, { params })
      .then((response) => ({ ...response, data: mapStocks(response.data) })),

  addStock: (id: string, data: CreateStockPayload) =>
    apiClient
      .post<RawStock>(`/Inventory/${id}/stocks`, data)
      .then((response) => ({ ...response, data: mapStock(response.data) })),

  updateStock: (stockId: string, data: UpdateStockPayload) =>
    apiClient
      .put<RawStock>(`/Inventory/stocks/${stockId}`, data)
      .then((response) => ({ ...response, data: mapStock(response.data) })),

  deleteStock: (stockId: string) => apiClient.delete(`/Inventory/stocks/${stockId}`),
};

export const inventoryTransactionService = {
  create: (data: CreateTransactionPayload) =>
    apiClient
      .post<RawInventoryTransaction>('/InventoryTransaction', data)
      .then((response) => ({ ...response, data: mapTransaction(response.data) })),

  getById: (id: string) =>
    apiClient
      .get<RawInventoryTransaction>(`/InventoryTransaction/${id}`)
      .then((response) => ({ ...response, data: mapTransaction(response.data) })),

  getByInventory: (inventoryId: string, params?: SearchTransactionParams) =>
    apiClient
      .get<
        PaginatedResponse<RawInventoryTransaction>
      >(`/InventoryTransaction/by-inventory/${inventoryId}`, { params })
      .then((response) => ({
        ...response,
        data: mapTransactions(response.data) as PaginatedResponse<InventoryTransaction>,
      })),

  getByType: (params?: SearchTransactionByTypeParams) =>
    apiClient
      .get<PaginatedResponse<RawInventoryTransaction>>('/InventoryTransaction/by-type', {
        params,
      })
      .then((response) => ({
        ...response,
        data: mapTransactions(response.data) as PaginatedResponse<InventoryTransaction>,
      })),

  getImportHistoryBySupplyItem: (inventoryId: string, supplyItemId: string) =>
    apiClient
      .get<
        RawInventoryTransaction[]
      >(`/InventoryTransaction/by-inventory/${inventoryId}/supply-item/${supplyItemId}/imports`)
      .then((response) => ({
        ...response,
        data: mapTransactions(response.data) as InventoryTransaction[],
      })),
};
