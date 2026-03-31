import { apiClient } from '@/lib/apiClients';

export interface CampaignGoal {
  resourceType: number;
  targetAmount: number;
  isRequired: boolean;
}

export interface CreateCampaignPayload {
  name: string;
  description: string;
  locationId: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail: string;
  type: number;
  completionRule: number;
  allowOverTarget: boolean;
  goals: CampaignGoal[];
  availablePeopleCount: number;
  reliefStationId: string;
}

export interface UpdateCampaignPayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail: string;
  allowOverTarget: boolean;
  completionRule: number;
}

export interface SearchCampaignParams {
  search?: string;
  status?: number;
  type?: number;
  locationId?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface AssignStationPayload {
  reliefStationId: string;
}

export interface AssignTeamPayload {
  teamId: string;
  role: number;
  initialStatus: number;
}

export interface UpdateStatusPayload {
  status: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  locationId: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail: string;
  type: number;
  completionRule: number;
  allowOverTarget: boolean;
  status: number;
  availablePeopleCount: number;
  reliefStationId: string;
  goals: CampaignGoal[];
}

export interface CampaignSummary {
  campaignId: string;
  name: string;
  status: number;
  type: number;
  completionRule: number;
  startDate: string;
  endDate: string;
  allowOverTarget: boolean;
  overallProgressPercent: number;
}

export const campaignService = {
  // Create Campaign
  create: (data: CreateCampaignPayload) => apiClient.post<Campaign>('/campaigns', data),

  // Get campaigns list
  getAll: (params?: SearchCampaignParams) =>
    apiClient.get<PaginatedResponse<CampaignSummary>>('/campaigns', { params }),

  // Get campaign details
  getById: (id: string) => apiClient.get<Campaign>(`/campaigns/${id}`),

  // Update campaign
  update: (id: string, data: UpdateCampaignPayload) =>
    apiClient.put<Campaign>(`/campaigns/${id}`, data),

  // Get campaign summary
  getSummary: (id: string) => apiClient.get<any>(`/campaigns/${id}/summary`),

  // Update campaign status
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    apiClient.patch(`/campaigns/${id}/status`, data),

  // Assign station
  assignStation: (id: string, data: AssignStationPayload) =>
    apiClient.post(`/campaigns/${id}/stations`, data),

  // Remove station
  removeStation: (id: string, reliefStationId: string) =>
    apiClient.delete(`/campaigns/${id}/stations/${reliefStationId}`),

  // Assign team
  assignTeam: (id: string, data: AssignTeamPayload) =>
    apiClient.post(`/campaigns/${id}/teams`, data),

  // Get campaign teams
  getTeams: (id: string) => apiClient.get<any>(`/campaigns/${id}/teams`),

  // Update team status
  updateTeamStatus: (id: string, teamId: string, data: UpdateStatusPayload) =>
    apiClient.patch(`/campaigns/${id}/teams/${teamId}/status`, data),

  // Remove team
  removeTeam: (id: string, teamId: string) => apiClient.delete(`/campaigns/${id}/teams/${teamId}`),
};
