import { apiClient } from '@/lib/apiClients';

export interface AttachmentPayload {
  fileUrl: string;
  contentType: string;
}

export interface RescueRequest {
  rescueRequestId: string;
  rescueType: number;
  disasterType: number;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  note: string;
  reporterFullName: string;
  reporterPhone: string;
  verificationStatus: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  attachments?: AttachmentPayload[];
  selectedPriorityCriteriaIds?: string[];
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
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const rescueRequestService = {
  create: (data: CreateRescueRequestPayload) =>
    apiClient.post<RescueRequest>('/RescueRequest', data),

  getAll: (params: GetRescueRequestsParams) =>
    apiClient.get<PaginatedResponse<RescueRequest>>('/RescueRequest', { params }),

  getById: (id: string) => apiClient.get<RescueRequest>(`/RescueRequest/${id}`),

  verify: (id: string, data: VerifyRescueRequestPayload) =>
    apiClient.post<RescueRequest>(`/RescueRequest/${id}/verify`, data),

  getPendingList: (params: GetPendingRescueRequestsParams) =>
    apiClient.get<PaginatedResponse<RescueRequest>>('/RescueRequest/pending/list', { params }),
};
