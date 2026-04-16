import { apiClient } from '@/lib/apiClients';

export interface ReliefHouseholdInputRequest {
  householdCode: string;
  headOfHouseholdName: string;
  contactPhone?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  householdSize: number;
  isIsolated: boolean;
  deliveryMode?: number | null;
}

export interface ImportCampaignHouseholdsRequest {
  households: ReliefHouseholdInputRequest[];
}

export interface CampaignHouseholdResponse {
  campaignHouseholdId: string;
  campaignId: string;
  distributionPointId?: string | null;
  campaignTeamId?: string | null;
  householdCode: string;
  headOfHouseholdName: string;
  contactPhone?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  householdSize: number;
  isIsolated: boolean;
  deliveryMode: number;
  fulfillmentStatus: number;
  notes?: string | null;
  createdAt: string;
}

export interface AssignHouseholdRequest {
  deliveryMode: number;
  distributionPointId?: string | null;
  campaignTeamId?: string | null;
  reliefPackageDefinitionId?: string | null;
  scheduledAt?: string | null;
  notes?: string | null;
}

export interface HouseholdDeliveryProofResponse {
  householdDeliveryProofId: string;
  fileUrl: string;
  fileType?: string | null;
  note?: string | null;
  capturedAt: string;
  capturedByUserId?: string | null;
}

export interface HouseholdDeliveryResponse {
  householdDeliveryId: string;
  campaignId: string;
  campaignHouseholdId: string;
  distributionPointId?: string | null;
  campaignTeamId?: string | null;
  reliefPackageDefinitionId: string;
  deliveredByUserId?: string | null;
  deliveryMode: number;
  status: number;
  scheduledAt: string;
  deliveredAt?: string | null;
  notes?: string | null;
  createdAt: string;
  proofs: HouseholdDeliveryProofResponse[];
}

export interface HouseholdChecklistItemResponse {
  householdDeliveryId: string;
  campaignId: string;
  campaignHouseholdId: string;
  householdCode: string;
  headOfHouseholdName: string;
  campaignTeamId?: string | null;
  distributionPointId?: string | null;
  reliefPackageDefinitionId: string;
  deliveryMode: number;
  status: number;
  scheduledAt: string;
  deliveredAt?: string | null;
  notes?: string | null;
  proofCount: number;
}

export interface CreateDistributionPointRequest {
  name: string;
  reliefStationId: string;
  campaignTeamId?: string | null;
  locationId?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  deliveryMode: number;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
}

export interface DistributionPointResponse {
  distributionPointId: string;
  campaignId: string;
  reliefStationId: string;
  campaignTeamId?: string | null;
  locationId?: string | null;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  deliveryMode: number;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
}

export interface ReliefPackageDefinitionItemRequest {
  supplyItemId: string;
  quantity: number;
  unit: string;
}

export interface CreateReliefPackageDefinitionRequest {
  name: string;
  description?: string | null;
  outputSupplyItemId: string;
  isDefault: boolean;
  isActive: boolean;
  items: ReliefPackageDefinitionItemRequest[];
}

export interface ReliefPackageDefinitionItemResponse {
  reliefPackageDefinitionItemId: string;
  supplyItemId: string;
  supplyItemName: string;
  quantity: number;
  unit: string;
}

export interface ReliefPackageDefinitionResponse {
  reliefPackageDefinitionId: string;
  campaignId: string;
  outputSupplyItemId: string;
  outputSupplyItemName: string;
  outputUnit: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  items: ReliefPackageDefinitionItemResponse[];
}

export interface ReliefPackageAssemblyAvailabilityItemResponse {
  supplyItemId: string;
  supplyItemName: string;
  unit: string;
  requiredPerPackage: number;
  availableQuantity: number;
  maxAssemblableByItem: number;
}

export interface ReliefPackageAssemblyAvailabilityResponse {
  campaignId: string;
  reliefStationId: string;
  inventoryId: string;
  reliefPackageDefinitionId: string;
  outputSupplyItemId: string;
  outputSupplyItemName: string;
  outputUnit: string;
  maxAssemblableQuantity: number;
  components: ReliefPackageAssemblyAvailabilityItemResponse[];
}

export interface AssembleReliefPackageRequest {
  reliefStationId: string;
  inventoryId: string;
  quantityToAssemble: number;
  notes?: string | null;
}

export interface ReliefPackageAssemblyConsumeItemResponse {
  supplyItemId: string;
  supplyItemName: string;
  unit: string;
  quantityConsumed: number;
}

export interface ReliefPackageAssemblyResponse {
  reliefPackageAssemblyId: string;
  campaignId: string;
  reliefStationId: string;
  inventoryId: string;
  reliefPackageDefinitionId: string;
  outputSupplyItemId: string;
  outputSupplyItemName: string;
  outputUnit: string;
  quantityCreated: number;
  createdBy: string;
  createdAt: string;
  notes?: string | null;
  details: ReliefPackageAssemblyConsumeItemResponse[];
}

export interface CompleteHouseholdDeliveryRequest {
  reliefPackageDefinitionId?: string | null;
  campaignTeamId?: string | null;
  notes?: string | null;
  proofNote?: string | null;
  proofFileUrl: string;
  proofContentType?: string | null;
}

export interface SupplyShortageItemRequest {
  supplyItemId: string;
  quantityRequested: number;
  note?: string | null;
}

export interface CreateSupplyShortageRequest {
  distributionPointId?: string | null;
  campaignTeamId?: string | null;
  reason?: string | null;
  items: SupplyShortageItemRequest[];
}

export interface ApprovedSupplyShortageItemRequest {
  supplyItemId: string;
  quantityApproved: number;
}

export interface ReviewSupplyShortageRequest {
  reviewNote?: string | null;
  approvedItems?: ApprovedSupplyShortageItemRequest[] | null;
}

export interface SupplyShortageRequestItemResponse {
  supplyShortageRequestItemId: string;
  supplyItemId: string;
  supplyItemName: string;
  quantityRequested: number;
  quantityApproved?: number | null;
  note?: string | null;
}

export interface SupplyShortageRequestResponse {
  supplyShortageRequestId: string;
  campaignId: string;
  distributionPointId?: string | null;
  campaignTeamId?: string | null;
  requestedByUserId: string;
  status: number;
  reason?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewNote?: string | null;
  items: SupplyShortageRequestItemResponse[];
}

export interface GetHouseholdsParams {
  status?: number;
}

export interface GetChecklistParams {
  campaignTeamId?: string;
  status?: number;
}

export interface GetShortageRequestsParams {
  status?: number;
}

export interface GetPackageAssemblyAvailabilityParams {
  reliefStationId: string;
  inventoryId: string;
}

const baseCampaignPath = (campaignId: string) => `/relief/campaigns/${campaignId}`;

export const reliefDistributionService = {
  importHouseholds: (campaignId: string, data: ImportCampaignHouseholdsRequest) =>
    apiClient.post<CampaignHouseholdResponse[]>(
      `${baseCampaignPath(campaignId)}/households/import`,
      data,
    ),

  getHouseholds: (campaignId: string, params?: GetHouseholdsParams) =>
    apiClient.get<CampaignHouseholdResponse[]>(`${baseCampaignPath(campaignId)}/households`, {
      params,
    }),

  assignHousehold: (
    campaignId: string,
    campaignHouseholdId: string,
    data: AssignHouseholdRequest,
  ) =>
    apiClient.patch<HouseholdDeliveryResponse>(
      `${baseCampaignPath(campaignId)}/households/${campaignHouseholdId}/assign`,
      data,
    ),

  getChecklist: (campaignId: string, params?: GetChecklistParams) =>
    apiClient.get<HouseholdChecklistItemResponse[]>(`${baseCampaignPath(campaignId)}/checklist`, {
      params,
    }),

  createDistributionPoint: (campaignId: string, data: CreateDistributionPointRequest) =>
    apiClient.post<DistributionPointResponse>(
      `${baseCampaignPath(campaignId)}/distribution-points`,
      data,
    ),

  getDistributionPoints: (campaignId: string) =>
    apiClient.get<DistributionPointResponse[]>(
      `${baseCampaignPath(campaignId)}/distribution-points`,
    ),

  createReliefPackage: (campaignId: string, data: CreateReliefPackageDefinitionRequest) =>
    apiClient.post<ReliefPackageDefinitionResponse>(
      `${baseCampaignPath(campaignId)}/packages`,
      data,
    ),

  getReliefPackages: (campaignId: string) =>
    apiClient.get<ReliefPackageDefinitionResponse[]>(`${baseCampaignPath(campaignId)}/packages`),

  getPackageAssemblyAvailability: (
    campaignId: string,
    reliefPackageDefinitionId: string,
    params: GetPackageAssemblyAvailabilityParams,
  ) =>
    apiClient.get<ReliefPackageAssemblyAvailabilityResponse>(
      `${baseCampaignPath(campaignId)}/packages/${reliefPackageDefinitionId}/assembly-availability`,
      { params },
    ),

  assembleReliefPackage: (
    campaignId: string,
    reliefPackageDefinitionId: string,
    data: AssembleReliefPackageRequest,
  ) =>
    apiClient.post<ReliefPackageAssemblyResponse>(
      `${baseCampaignPath(campaignId)}/packages/${reliefPackageDefinitionId}/assemble`,
      data,
    ),

  getPackageAssemblyHistoryByCampaign: (campaignId: string) =>
    apiClient.get<ReliefPackageAssemblyResponse[]>(
      `${baseCampaignPath(campaignId)}/package-assemblies`,
    ),

  getPackageAssemblyHistoryByStation: (campaignId: string, reliefStationId: string) =>
    apiClient.get<ReliefPackageAssemblyResponse[]>(
      `${baseCampaignPath(campaignId)}/stations/${reliefStationId}/package-assemblies`,
    ),

  getPackageAssemblyHistoryByDefinition: (campaignId: string, reliefPackageDefinitionId: string) =>
    apiClient.get<ReliefPackageAssemblyResponse[]>(
      `${baseCampaignPath(campaignId)}/packages/${reliefPackageDefinitionId}/package-assemblies`,
    ),

  completeDelivery: (
    campaignId: string,
    householdDeliveryId: string,
    data: CompleteHouseholdDeliveryRequest,
  ) =>
    apiClient.post<HouseholdDeliveryResponse>(
      `${baseCampaignPath(campaignId)}/deliveries/${householdDeliveryId}/complete`,
      data,
    ),

  createShortageRequest: (campaignId: string, data: CreateSupplyShortageRequest) =>
    apiClient.post<SupplyShortageRequestResponse>(
      `${baseCampaignPath(campaignId)}/shortage-requests`,
      data,
    ),

  getShortageRequests: (campaignId: string, params?: GetShortageRequestsParams) =>
    apiClient.get<SupplyShortageRequestResponse[]>(
      `${baseCampaignPath(campaignId)}/shortage-requests`,
      {
        params,
      },
    ),

  approveShortageRequest: (
    campaignId: string,
    shortageRequestId: string,
    data: ReviewSupplyShortageRequest,
  ) =>
    apiClient.patch<SupplyShortageRequestResponse>(
      `${baseCampaignPath(campaignId)}/shortage-requests/${shortageRequestId}/approve`,
      data,
    ),

  rejectShortageRequest: (
    campaignId: string,
    shortageRequestId: string,
    data: ReviewSupplyShortageRequest,
  ) =>
    apiClient.patch<SupplyShortageRequestResponse>(
      `${baseCampaignPath(campaignId)}/shortage-requests/${shortageRequestId}/reject`,
      data,
    ),
};
