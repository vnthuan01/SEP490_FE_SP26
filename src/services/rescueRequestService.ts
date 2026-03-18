import { apiClient } from '@/lib/apiClients';

export interface AttachmentPayload {
  fileUrl: string;
  contentType: string;
}

export interface CreateRescueRequestPayload {
  rescueType: number;
  disasterType: number;
  description: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  locationId: string;
  note: string;
  reporterFullName: string;
  reporterPhone: string;
  attachments: AttachmentPayload[];
  selectedPriorityCriteriaIds: string[];
}

export interface VerifyRescueRequestPayload {
  status: number;
  method: number;
  note: string;
  reason: string;
}

export interface GetRescueRequestsParams {
  pageNumber?: number;
  pageSize?: number;
  statusFilter?: number;
}

export interface GetPendingRescueRequestsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  items: T[];
}

export const rescueRequestService = {
  create: (data: CreateRescueRequestPayload) => apiClient.post<any>('/RescueRequest', data),

  getAll: (params: GetRescueRequestsParams) =>
    apiClient.get<PaginatedResponse<any>>('/RescueRequest', { params }),

  getById: (id: string) => apiClient.get<any>(`/RescueRequest/${id}`),

  verify: (id: string, data: VerifyRescueRequestPayload) =>
    apiClient.post(`/RescueRequest/${id}/verify`, data),

  getPendingList: (params: GetPendingRescueRequestsParams) =>
    apiClient.get<PaginatedResponse<any>>('/RescueRequest/pending/list', { params }),
};
