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

export const skillsService = {
  // Get all skills
  getAll: () => apiClient.get<Skill[]>('/Skill'),

  // Get skill by id
  getById: (id: string) => apiClient.get<Skill>(`/Skill/${id}`),

  // Create new skill
  create: (data: CreateSkillPayload) => apiClient.post<Skill>('/Skill', data),

  // Update existing skill
  update: (id: string, data: UpdateSkillPayload) => apiClient.put(`/Skill/${id}`, data),

  // Delete skill
  delete: (id: string) => apiClient.delete(`/Skill/${id}`),
};
