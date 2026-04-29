import { apiClient } from '@/lib/apiClients';

export interface CampaignGoalPayload {
  resourceType: number;
  targetAmount: number;
  isRequired: boolean;
}

export interface CampaignGoal extends CampaignGoalPayload {
  campaignResourceGoalId?: string;
  receivedAmount?: number;
  isMet?: boolean;
  progressPercent?: number;
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
  goals: CampaignGoalPayload[];
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

export interface CampaignStation {
  reliefStationId: string;
  reliefStationName: string;
  isActive: boolean;
  assignedAt: string;
}

export interface CampaignTeam {
  campaignTeamId: string;
  campaignId: string;
  teamId: string;
  teamName: string;
  role: number;
  status: number;
  assignedAt: string;
  memberCount: number;
  vehicles?: CampaignAssignedVehicle[];
}

export interface CampaignAssignedVehicle {
  campaignVehicleId: string;
  vehicleId: string;
  licensePlate: string;
  vehicleTypeId?: string;
  vehicleTypeName: string;
  campaignTeamId?: string | null;
  campaignTeamName?: string | null;
  assignedDriverId?: string | null;
  driverName?: string | null;
  reliefStationId?: string | null;
  currentVehicleStatus?: number;
  status: number;
  startDate: string;
  endDate?: string | null;
  note?: string | null;
}

export interface AssignCampaignVehiclePayload {
  vehicleId: string;
  campaignTeamId: string;
  assignedDriverId?: string | null;
  startDate?: string;
  endDate?: string | null;
  status?: number;
  note?: string | null;
}

export interface UpdateCampaignVehicleAssignmentPayload {
  campaignTeamId?: string | null;
  assignedDriverId?: string | null;
  startDate?: string;
  endDate?: string | null;
  status?: number;
  note?: string | null;
}

export interface Campaign {
  campaignId: string;
  locationId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail?: string | null;
  status: number;
  type: number;
  completionRule: number;
  allowOverTarget: boolean;
  createdAt: string;
  goals: CampaignGoal[];
  stations: CampaignStation[];
}

export interface PublicCampaignSummary {
  campaignId: string;
  name: string;
  description?: string | null;
  type: number;
  status: number;
  startDate: string;
  endDate: string;
  totalMoneyReceived: number;
  totalMoneySpent: number;
  remainingBudget: number;
  peopleTarget: number;
  peopleReached: number;
  procurementOrderCount: number;
  procurementReceivedCount: number;
  procurementEstimatedTotal: number;
  procurementActualTotal: number;
  totalSuppliesPurchasedUnits: number;
  totalSuppliesAllocatedUnits: number;
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

export interface CampaignInventoryBalance {
  campaignId: string;
  campaignInventoryId?: string | null;
  budgetTotal: number;
  budgetSpent: number;
  remainingBudget: number;
  distinctSupplyItemCount?: number;
  totalQuantity?: number;
  items?: Array<{
    supplyItemId: string;
    supplyItemName: string;
    supplyItemUnit: string;
    quantity: number;
  }>;
  stations?: Array<{
    reliefStationId: string;
    reliefStationName: string;
    inventoryId: string;
    hasActiveInventory: boolean;
    distinctSupplyItemCount: number;
    totalQuantity: number;
  }>;
}

export interface ExtractCampaignBudgetRequest {
  targetReliefCampaignId: string;
  amount: number;
  note?: string | null;
}

export interface CampaignBudgetTransferResponse {
  campaignBudgetTransferId: string;
  sourceCampaignId: string;
  targetCampaignId: string;
  amount: number;
  transferredByUserId?: string | null;
  transferredAt: string;
  note?: string | null;
  sourceRemainingBudget: number;
  targetRemainingBudget: number;
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
  getSummary: (id: string) => apiClient.get<PublicCampaignSummary>(`/campaigns/${id}/summary`),

  // Get campaign inventory balance
  getInventoryBalance: (id: string) =>
    apiClient.get<CampaignInventoryBalance>(`/campaigns/${id}/inventory-balance`),

  // Extract budget to relief campaign
  extractBudget: (id: string, data: ExtractCampaignBudgetRequest) =>
    apiClient.post<CampaignBudgetTransferResponse>(`/campaigns/${id}/extract-budget`, data),

  // Update campaign status
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    apiClient.patch(`/campaigns/${id}/status`, data),

  // Assign station
  assignStation: (id: string, data: AssignStationPayload) =>
    apiClient.post<CampaignStation>(`/campaigns/${id}/stations`, data),

  // Remove station
  removeStation: (id: string, reliefStationId: string) =>
    apiClient.delete(`/campaigns/${id}/stations/${reliefStationId}`),

  // Assign team
  assignTeam: (id: string, data: AssignTeamPayload) =>
    apiClient.post<CampaignTeam>(`/campaigns/${id}/teams`, data),

  // Get campaign teams
  getTeams: (id: string) => apiClient.get<CampaignTeam[]>(`/campaigns/${id}/teams`),

  // Update team status
  updateTeamStatus: (id: string, teamId: string, data: UpdateStatusPayload) =>
    apiClient.patch(`/campaigns/${id}/teams/${teamId}/status`, data),

  // Remove team
  removeTeam: (id: string, teamId: string) => apiClient.delete(`/campaigns/${id}/teams/${teamId}`),

  assignVehicleToTeam: (id: string, campaignTeamId: string, data: AssignCampaignVehiclePayload) =>
    apiClient.post<CampaignAssignedVehicle>(
      `/campaigns/${id}/teams/${campaignTeamId}/vehicles`,
      data,
    ),

  getCampaignVehicles: (id: string, campaignTeamId?: string) =>
    apiClient.get<CampaignAssignedVehicle[]>(`/campaigns/${id}/vehicles`, {
      params: campaignTeamId ? { campaignTeamId } : undefined,
    }),

  updateCampaignVehicleAssignment: (
    id: string,
    campaignVehicleId: string,
    data: UpdateCampaignVehicleAssignmentPayload,
  ) =>
    apiClient.patch<CampaignAssignedVehicle>(
      `/campaigns/${id}/vehicles/${campaignVehicleId}`,
      data,
    ),

  removeCampaignVehicleAssignment: (id: string, campaignVehicleId: string) =>
    apiClient.delete(`/campaigns/${id}/vehicles/${campaignVehicleId}`),
};
