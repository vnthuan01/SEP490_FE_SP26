import { apiClient } from '@/lib/apiClients';

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface SupplyItem {
  id: string;
  supplyItemId?: string;
  name: string;
  description: string;
  iconUrl: string;
  category: number;
  unit: string;
}

export const normalizeSupplyItem = (item: any): SupplyItem => ({
  ...item,
  id: item?.id || item?.supplyItemId || '',
  supplyItemId: item?.supplyItemId || item?.id || '',
  name: item?.name || '',
  description: item?.description || '',
  iconUrl: item?.iconUrl || '',
  category: Number(item?.category ?? 0),
  unit: item?.unit || '',
});

export const normalizeSupplyItemPage = (
  response: PaginatedResponse<any>,
): PaginatedResponse<SupplyItem> => ({
  ...response,
  items: Array.isArray(response?.items) ? response.items.map(normalizeSupplyItem) : [],
});

export interface CreateSupplyItemPayload {
  name: string;
  description: string;
  iconUrl: string;
  category: number;
  unit: string;
}

export interface UpdateSupplyItemPayload {
  name: string;
  description: string;
  iconUrl: string;
  category: number;
  unit: string;
}

export interface SearchSupplyItemsParams {
  category?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface SupplyAllocationItemPayload {
  supplyItemId: string;
  quantity: number;
}

export interface CreateSupplyAllocationPayload {
  campaignId: string;
  sourceInventoryId: string;
  items: SupplyAllocationItemPayload[];
}

export interface UpdateSupplyAllocationStatusPayload {
  status: number;
}

export interface SupplyAllocation {
  allocationId: string;
  campaignId: string;
  sourceInventoryId: string;
  sourceInventoryName: string;

  status: number;
  items: SupplyAllocationItemPayload[];
}

export interface SearchSupplyAllocationByStatusParams {
  status?: number;
}

export const supplyItemService = {
  create: (data: CreateSupplyItemPayload) => apiClient.post<SupplyItem>('/SupplyItem', data),

  getAll: (params?: SearchSupplyItemsParams) =>
    apiClient.get<PaginatedResponse<SupplyItem>>('/SupplyItem', { params }),

  getById: (id: string) => apiClient.get<SupplyItem>(`/SupplyItem/${id}`),

  update: (id: string, data: UpdateSupplyItemPayload) =>
    apiClient.put<SupplyItem>(`/SupplyItem/${id}`, data),

  delete: (id: string) => apiClient.delete(`/SupplyItem/${id}`),
};

export const supplyAllocationService = {
  create: (data: CreateSupplyAllocationPayload) =>
    apiClient.post<SupplyAllocation>('/SupplyAllocation', data),

  getById: (id: string) => apiClient.get<SupplyAllocation>(`/SupplyAllocation/${id}`),

  getByCampaign: (campaignId: string) =>
    apiClient.get<SupplyAllocation[]>(`/SupplyAllocation/by-campaign/${campaignId}`),

  getByInventory: (inventoryId: string) =>
    apiClient.get<SupplyAllocation[]>(`/SupplyAllocation/by-inventory/${inventoryId}`),

  getByStatus: (params?: SearchSupplyAllocationByStatusParams) =>
    apiClient.get<SupplyAllocation[]>('/SupplyAllocation/by-status', { params }),

  updateStatus: (id: string, data: UpdateSupplyAllocationStatusPayload) =>
    apiClient.patch<SupplyAllocation>(`/SupplyAllocation/${id}/status`, data),
};
