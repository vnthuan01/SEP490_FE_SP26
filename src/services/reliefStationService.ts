import { apiClient } from '@/lib/apiClients';

export interface ReliefStation {
  id: string;
  locationId: string;
  name: string;
  address: string;
  contactNumber: string;
  longitude: number;
  latitude: number;
  status: number;
  // Khai báo thêm nếu cần
}

export interface CreateProvincialStationPayload {
  locationId: string;
  name: string;
  address: string;
  contactNumber: string;
  longitude: number;
  latitude: number;
}

export interface UpdateProvincialStationPayload {
  name: string;
  address: string;
  contactNumber: string;
  longitude: number;
  latitude: number;
}

export interface SearchProvincialStationParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface AssignModeratorPayload {
  moderatorUserId: string;
  isStationHead: boolean;
  status: number;
  reason: string;
}

export interface AssignTeamPayload {
  teamId: string;
  description: string;
}

export interface UpdateTeamStatusPayload {
  status: number;
  description: string;
  rejectionReason: string;
}

export interface PaginatedResponse<T> {
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  items: T[];
}

export interface CreateStationJoinRequestPayload {
  teamId: string;
  reliefStationId: string;
  description: string;
}

export interface ReviewStationJoinRequestPayload {
  reviewNote: string;
  rejectionReason: string;
}

export interface GetMyStationJoinRequestsParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface GetPendingStationJoinRequestsParams {
  pageIndex?: number;
  pageSize?: number;
}

export const reliefStationService = {
  // Provincial endpoints
  getProvincialStations: (params: SearchProvincialStationParams) =>
    apiClient.get<PaginatedResponse<ReliefStation>>('/relief-stations/provincial', { params }),

  createProvincialStation: (data: CreateProvincialStationPayload) =>
    apiClient.post<ReliefStation>('/relief-stations/provincial', data),

  updateProvincialStation: (stationId: string, data: UpdateProvincialStationPayload) =>
    apiClient.put<ReliefStation>(`/relief-stations/provincial/${stationId}`, data),

  disableProvincialStation: (stationId: string) =>
    apiClient.put(`/relief-stations/provincial/${stationId}/disable`),

  activateProvincialStation: (stationId: string) =>
    apiClient.put(`/relief-stations/provincial/${stationId}/activate`),

  // Station endpoints
  assignModerator: (stationId: string, data: AssignModeratorPayload) =>
    apiClient.put(`/relief-stations/${stationId}/assign-moderator`, data),

  assignTeam: (stationId: string, data: AssignTeamPayload) =>
    apiClient.post(`/relief-stations/${stationId}/teams`, data),

  updateTeamStatus: (stationId: string, teamId: string, data: UpdateTeamStatusPayload) =>
    apiClient.patch(`/relief-stations/${stationId}/teams/${teamId}/status`, data),
};

export const stationJoinRequestService = {
  create: (data: CreateStationJoinRequestPayload) =>
    apiClient.post<any>('/StationJoinRequest', data),

  getById: (id: string) => apiClient.get<any>(`/StationJoinRequest/${id}`),

  getMyRequests: (params: GetMyStationJoinRequestsParams) =>
    apiClient.get<PaginatedResponse<any>>('/StationJoinRequest/my-requests', { params }),

  cancel: (id: string) => apiClient.patch(`/StationJoinRequest/${id}/cancel`),

  getPendingRequests: (stationId: string, params: GetPendingStationJoinRequestsParams) =>
    apiClient.get<PaginatedResponse<any>>(`/StationJoinRequest/station/${stationId}/pending`, {
      params,
    }),

  approve: (id: string, data: ReviewStationJoinRequestPayload) =>
    apiClient.patch(`/StationJoinRequest/${id}/approve`, data),

  reject: (id: string, data: ReviewStationJoinRequestPayload) =>
    apiClient.patch(`/StationJoinRequest/${id}/reject`, data),
};
