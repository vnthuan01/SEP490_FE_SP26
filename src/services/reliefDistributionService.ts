import { apiClient } from '@/lib/apiClients';

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

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
  cashSupportAmount?: number | null;
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
  outputSupplyItemId?: string;
  cashSupportAmount?: number | null;
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
  cashSupportAmount?: number | null;
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
  campaignInventoryId?: string | null;
  reliefStationId: string;
  inventoryId?: string;
  reliefPackageDefinitionId: string;
  outputSupplyItemId: string;
  outputSupplyItemName: string;
  outputUnit: string;
  maxAssemblableQuantity: number;
  components: ReliefPackageAssemblyAvailabilityItemResponse[];
}

export interface AssembleReliefPackageRequest {
  reliefStationId: string;
  campaignInventoryId: string;
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
  campaignInventoryId?: string | null;
  inventoryId?: string;
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
  cashSupportAmount?: number | null;
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
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  deliveryMode?: number;
  fulfillmentStatus?: number;
  isIsolated?: boolean;
  campaignTeamId?: string;
  distributionPointId?: string;
}

export interface GetChecklistParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  campaignTeamId?: string;
  status?: number;
  deliveryMode?: number;
  distributionPointId?: string;
}

export interface GetDistributionPointsParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  reliefStationId?: string;
  campaignTeamId?: string;
  locationId?: string;
  deliveryMode?: number;
  isActive?: boolean;
}

export interface GetReliefPackagesParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  outputSupplyItemId?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface GetDeliveriesParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  campaignTeamId?: string;
  distributionPointId?: string;
  reliefPackageDefinitionId?: string;
  deliveryMode?: number;
  status?: number;
}

export interface CompleteDeliveriesBatchItemRequest {
  householdDeliveryId: string;
  cashSupportAmount?: number | null;
  notes?: string | null;
  proofNote?: string | null;
  proofFileUrl: string;
  proofContentType?: string | null;
}

export interface CompleteDeliveriesBatchRequest {
  deliveries: CompleteDeliveriesBatchItemRequest[];
}

export interface UpdateCampaignHouseholdRequest {
  householdCode?: string;
  headOfHouseholdName?: string;
  contactPhone?: string | null;
  address?: string | null;
  latitude?: number;
  longitude?: number;
  householdSize?: number;
  isIsolated?: boolean;
  deliveryMode?: number | null;
  notes?: string | null;
}

export interface UpdateDistributionPointRequest {
  name?: string;
  reliefStationId?: string;
  campaignTeamId?: string | null;
  locationId?: string | null;
  address?: string | null;
  latitude?: number;
  longitude?: number;
  deliveryMode?: number;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface UpdateReliefPackageDefinitionRequest {
  name?: string;
  description?: string | null;
  outputSupplyItemId?: string;
  cashSupportAmount?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
  items?: ReliefPackageDefinitionItemRequest[];
}

export interface GetShortageRequestsParams {
  status?: number;
}

export interface GetPackageAssemblyAvailabilityParams {
  reliefStationId: string;
  campaignInventoryId: string;
}

const baseCampaignPath = (campaignId: string) => `/relief/campaigns/${campaignId}`;

function mapPaginatedResponse<T>(raw: PaginatedResponse<T> | T[]): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      currentPage: 1,
      totalPages: 1,
      pageSize: raw.length,
      totalCount: raw.length,
      hasPrevious: false,
      hasNext: false,
      items: raw,
    };
  }

  return {
    currentPage: Number(raw.currentPage || 1),
    totalPages: Number(raw.totalPages || 1),
    pageSize: Number(raw.pageSize || raw.items?.length || 0),
    totalCount: Number(raw.totalCount || raw.items?.length || 0),
    hasPrevious: Boolean(raw.hasPrevious),
    hasNext: Boolean(raw.hasNext),
    items: raw.items || [],
  };
}

export const reliefDistributionService = {
  importHouseholds: (campaignId: string, data: ImportCampaignHouseholdsRequest) =>
    apiClient.post<CampaignHouseholdResponse[]>(
      `${baseCampaignPath(campaignId)}/households/import`,
      data,
    ),

  getHouseholds: (campaignId: string, params?: GetHouseholdsParams) =>
    apiClient
      .get<PaginatedResponse<CampaignHouseholdResponse> | CampaignHouseholdResponse[]>(
        `${baseCampaignPath(campaignId)}/households`,
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapPaginatedResponse(response.data) })),

  patchHousehold: (
    campaignId: string,
    campaignHouseholdId: string,
    data: UpdateCampaignHouseholdRequest,
  ) =>
    apiClient.patch<CampaignHouseholdResponse>(
      `${baseCampaignPath(campaignId)}/households/${campaignHouseholdId}`,
      data,
    ),

  deleteHousehold: (campaignId: string, campaignHouseholdId: string) =>
    apiClient.delete(`${baseCampaignPath(campaignId)}/households/${campaignHouseholdId}`),

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
    apiClient
      .get<PaginatedResponse<HouseholdChecklistItemResponse> | HouseholdChecklistItemResponse[]>(
        `${baseCampaignPath(campaignId)}/checklist`,
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapPaginatedResponse(response.data) })),

  createDistributionPoint: (campaignId: string, data: CreateDistributionPointRequest) =>
    apiClient.post<DistributionPointResponse>(
      `${baseCampaignPath(campaignId)}/distribution-points`,
      data,
    ),

  getDistributionPoints: (campaignId: string, params?: GetDistributionPointsParams) =>
    apiClient
      .get<PaginatedResponse<DistributionPointResponse> | DistributionPointResponse[]>(
        `${baseCampaignPath(campaignId)}/distribution-points`,
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapPaginatedResponse(response.data) })),

  patchDistributionPoint: (
    campaignId: string,
    distributionPointId: string,
    data: UpdateDistributionPointRequest,
  ) =>
    apiClient.patch<DistributionPointResponse>(
      `${baseCampaignPath(campaignId)}/distribution-points/${distributionPointId}`,
      data,
    ),

  deleteDistributionPoint: (campaignId: string, distributionPointId: string) =>
    apiClient.delete(`${baseCampaignPath(campaignId)}/distribution-points/${distributionPointId}`),

  createReliefPackage: (campaignId: string, data: CreateReliefPackageDefinitionRequest) =>
    apiClient.post<ReliefPackageDefinitionResponse>(
      `${baseCampaignPath(campaignId)}/packages`,
      data,
    ),

  getReliefPackages: (campaignId: string, params?: GetReliefPackagesParams) =>
    apiClient
      .get<PaginatedResponse<ReliefPackageDefinitionResponse> | ReliefPackageDefinitionResponse[]>(
        `${baseCampaignPath(campaignId)}/packages`,
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapPaginatedResponse(response.data) })),

  patchReliefPackage: (
    campaignId: string,
    reliefPackageDefinitionId: string,
    data: UpdateReliefPackageDefinitionRequest,
  ) =>
    apiClient.patch<ReliefPackageDefinitionResponse>(
      `${baseCampaignPath(campaignId)}/packages/${reliefPackageDefinitionId}`,
      data,
    ),

  deleteReliefPackage: (campaignId: string, reliefPackageDefinitionId: string) =>
    apiClient.delete(`${baseCampaignPath(campaignId)}/packages/${reliefPackageDefinitionId}`),

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

  getDeliveries: (campaignId: string, params?: GetDeliveriesParams) =>
    apiClient
      .get<PaginatedResponse<HouseholdDeliveryResponse> | HouseholdDeliveryResponse[]>(
        `${baseCampaignPath(campaignId)}/deliveries`,
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapPaginatedResponse(response.data) })),

  getDeliveryDetail: (campaignId: string, householdDeliveryId: string) =>
    apiClient.get<HouseholdDeliveryResponse>(
      `${baseCampaignPath(campaignId)}/deliveries/${householdDeliveryId}`,
    ),

  completeDeliveryBatch: (campaignId: string, data: CompleteDeliveriesBatchRequest) =>
    apiClient.post<HouseholdDeliveryResponse[]>(
      `${baseCampaignPath(campaignId)}/deliveries/complete-batch`,
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
