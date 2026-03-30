import { apiClient } from '@/lib/apiClients';

export interface Team {
  teamId: string;
  name: string;
  description: string;
  status: number;
  moderatorId: string;
  moderatorName: string;
  leaderId: string | null;
  leaderName: string | null;
  totalMembers: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTeamPayload {
  name: string;
  description: string;
}

export interface UpdateTeamPayload {
  name: string;
  description: string;
  status: number;
  leaderId: string;
}

export interface SearchTeamParams {
  Name?: string;
  Status?: number;
  ModeratorId?: string;
  PageIndex?: number;
  PageSize?: number;
}

export interface AddTeamMemberPayload {
  volunteerId: string;
}

export const teamService = {
  //Team CRUD
  getAll: () => apiClient.get<Team[]>('/Team'),

  getById: (id: string) => apiClient.get<Team>(`/Team/${id}`),

  create: (data: CreateTeamPayload) => apiClient.post<Team>('/Team', data),

  update: (id: string, data: UpdateTeamPayload) => apiClient.put(`/Team/${id}`, data),

  delete: (id: string) => apiClient.delete(`/Team/${id}`),

  //Advanced Queries
  //Note: Using any[] or any for responses we don't have exact schemas for, you can replace these later
  search: (params: SearchTeamParams) => apiClient.get<any>('/Team/search', { params }),

  getMyTeams: () => apiClient.get<any[]>('/Team/my-teams'),

  getMyTeam: () => apiClient.get<any>('/Team/my-team'),

  //Members Management
  getMembers: (id: string) => apiClient.get<any[]>(`/Team/${id}/members`),

  addMember: (id: string, data: AddTeamMemberPayload) =>
    apiClient.post(`/Team/${id}/members`, data),

  promoteToLeader: (id: string, userId: string) =>
    apiClient.patch(`/Team/${id}/members/${userId}/promote-to-leader`),

  removeMember: (id: string, userId: string) => apiClient.delete(`/Team/${id}/members/${userId}`),
};

//Team Join Request Payload Interfaces
export interface CreateTeamJoinRequestPayload {
  teamId: string;
  reason: string;
}

export interface ReviewTeamJoinRequestPayload {
  reviewNote: string;
}

//Team Join Request Service
export const teamJoinRequestService = {
  // Volunteer APIs
  create: (data: CreateTeamJoinRequestPayload) => apiClient.post<any>('/TeamJoinRequest', data),
  getMyRequests: () => apiClient.get<any[]>('/TeamJoinRequest/my-requests'),
  cancel: (id: string) => apiClient.patch(`/TeamJoinRequest/${id}/cancel`),

  // Moderator APIs
  getRequestsByTeam: (teamId: string) => apiClient.get<any[]>(`/TeamJoinRequest/team/${teamId}`),
  approve: (id: string, data: ReviewTeamJoinRequestPayload) =>
    apiClient.patch(`/TeamJoinRequest/${id}/approve`, data),
  reject: (id: string, data: ReviewTeamJoinRequestPayload) =>
    apiClient.patch(`/TeamJoinRequest/${id}/reject`, data),

  // Shared APIs
  getById: (id: string) => apiClient.get<any>(`/TeamJoinRequest/${id}`),
};
