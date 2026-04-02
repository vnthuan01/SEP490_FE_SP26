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

export interface DistributionSession {
  id: string;
  campaignId?: string;
  reliefStationId?: string;
  status?: number;
  scheduledDate?: string;
  notes?: string;
}

export interface CreateDistributionSessionPayload {
  campaignId: string;
  reliefStationId: string;
  scheduledDate?: string;
  notes?: string;
}

export interface DistributionSessionItemPayload {
  supplyItemId: string;
  quantity: number;
  notes?: string;
}

export interface DistributionSessionRequestPayload {
  rescueRequestId: string;
  notes?: string;
}

export interface SearchDistributionSessionsParams {
  pageIndex?: number;
  pageSize?: number;
  campaignId?: string;
  reliefStationId?: string;
  status?: number;
}

export const distributionSessionService = {
  create: (data: CreateDistributionSessionPayload) =>
    apiClient.post<DistributionSession>('/DistributionSession', data),

  getAll: (params?: SearchDistributionSessionsParams) =>
    apiClient.get<PaginatedResponse<DistributionSession> | DistributionSession[]>(
      '/DistributionSession',
      {
        params,
      },
    ),

  getById: (id: string) => apiClient.get<DistributionSession>(`/DistributionSession/${id}`),

  addItems: (id: string, data: DistributionSessionItemPayload[]) =>
    apiClient.post(`/DistributionSession/${id}/items`, data),

  addRequests: (id: string, data: DistributionSessionRequestPayload[]) =>
    apiClient.post(`/DistributionSession/${id}/requests`, data),

  ready: (id: string) => apiClient.post(`/DistributionSession/${id}/ready`),

  start: (id: string) => apiClient.post(`/DistributionSession/${id}/start`),

  complete: (id: string) => apiClient.post(`/DistributionSession/${id}/complete`),

  cancel: (id: string) => apiClient.post(`/DistributionSession/${id}/cancel`),
};
