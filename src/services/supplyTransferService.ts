import { apiClient } from '@/lib/apiClients';

export interface PaginatedResponse<T> {
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  items: T[];
}

export interface SupplyTransferItem {
  supplyItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateSupplyTransferPayload {
  sourceStationId: string;
  destinationStationId: string;
  notes?: string;
  items: SupplyTransferItem[];
}

export interface SupplyTransfer {
  id: string;
  sourceStationId: string;
  destinationStationId: string;
  status: number;
  notes?: string;
  items: SupplyTransferItem[];
  createdAt?: string;
}

export interface SearchSupplyTransferByStatusParams {
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}

export const supplyTransferService = {
  create: (data: CreateSupplyTransferPayload) =>
    apiClient.post<SupplyTransfer>('/SupplyTransfer', data),

  getById: (id: string) => apiClient.get<SupplyTransfer>(`/SupplyTransfer/${id}`),

  getByStatus: (params?: SearchSupplyTransferByStatusParams) =>
    apiClient.get<PaginatedResponse<SupplyTransfer> | SupplyTransfer[]>(
      '/SupplyTransfer/by-status',
      {
        params,
      },
    ),

  getBySourceStation: (stationId: string) =>
    apiClient.get<SupplyTransfer[]>(`/SupplyTransfer/by-source-station/${stationId}`),

  getByDestinationStation: (stationId: string) =>
    apiClient.get<SupplyTransfer[]>(`/SupplyTransfer/by-destination-station/${stationId}`),

  approve: (id: string) => apiClient.patch(`/SupplyTransfer/${id}/approve`),

  ship: (id: string) => apiClient.patch(`/SupplyTransfer/${id}/ship`),

  receive: (id: string) => apiClient.patch(`/SupplyTransfer/${id}/receive`),

  cancel: (id: string) => apiClient.patch(`/SupplyTransfer/${id}/cancel`),
};
