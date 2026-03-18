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

export const priorityCriteriaService = {
  getAll: () => apiClient.get<PriorityCriteria[]>('/priority-criteria'),

  getById: (id: string) => apiClient.get<PriorityCriteria>(`/priority-criteria/${id}`),

  create: (data: CreatePriorityCriteriaPayload) =>
    apiClient.post<PriorityCriteria>('/priority-criteria', data),

  update: (id: string, data: UpdatePriorityCriteriaPayload) =>
    apiClient.put<PriorityCriteria>(`/priority-criteria/${id}`, data),

  delete: (id: string) => apiClient.delete(`/priority-criteria/${id}`),
};
