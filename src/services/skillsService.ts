import { apiClient } from '@/lib/apiClients';

//Interfaces for Skill Models
export interface Skill {
  skillId: string;
  code: string;
  name: string;
  description: string;
}

export interface CreateSkillPayload {
  code: string;
  name: string;
  description: string;
}

export interface UpdateSkillPayload {
  name: string;
  description: string;
}

export interface SearchSkillParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SkillPaginatedResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: Skill[];
}

export const skillsService = {
  // Get all skills
  getAll: (params?: SearchSkillParams) =>
    apiClient.get<SkillPaginatedResponse>('/Skill', { params }),

  // Get skill by id
  getById: (id: string) => apiClient.get<Skill>(`/Skill/${id}`),

  // Create new skill
  create: (data: CreateSkillPayload) => apiClient.post<Skill>('/Skill', data),

  // Update existing skill
  update: (id: string, data: UpdateSkillPayload) => apiClient.put(`/Skill/${id}`, data),

  // Delete skill
  delete: (id: string) => apiClient.delete(`/Skill/${id}`),
};
