import { apiClient } from '@/lib/apiClients';

export interface PriorityCriteria {
  priorityCriteriaId: string;
  name: string;
  point: number;
  disasterType: number;
  code: string;
  description: string;
  status: string;
}

export interface CreatePriorityCriteriaPayload {
  name: string;
  point: number;
  disasterType: number;
  code: string;
  description: string;
}

export interface UpdatePriorityCriteriaPayload {
  name: string;
  point: number;
  disasterType: number;
  code: string;
  description: string;
  status: string;
}

export interface SearchPriorityCriteriaParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PriorityCriteriaPaginatedResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: PriorityCriteria[];
}

export const priorityCriteriaService = {
  getAll: (params?: SearchPriorityCriteriaParams) =>
    apiClient.get<PriorityCriteriaPaginatedResponse>('/priority-criteria', { params }),

  getById: (id: string) => apiClient.get<PriorityCriteria>(`/priority-criteria/${id}`),

  create: (data: CreatePriorityCriteriaPayload) =>
    apiClient.post<PriorityCriteria>('/priority-criteria', data),

  update: (id: string, data: UpdatePriorityCriteriaPayload) =>
    apiClient.put<PriorityCriteria>(`/priority-criteria/${id}`, data),

  delete: (id: string) => apiClient.delete(`/priority-criteria/${id}`),
};
