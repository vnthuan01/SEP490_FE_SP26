import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';
import {
  reliefDistributionService,
  type AssembleReliefPackageRequest,
  type AssignHouseholdRequest,
  type CompleteDeliveriesBatchRequest,
  type CompleteHouseholdDeliveryRequest,
  type CreateDistributionPointRequest,
  type CreateReliefPackageDefinitionRequest,
  type CreateSupplyShortageRequest,
  type GetChecklistParams,
  type GetDeliveriesParams,
  type GetDistributionPointsParams,
  type GetHouseholdsParams,
  type GetPackageAssemblyAvailabilityParams,
  type GetReliefPackagesParams,
  type GetShortageRequestsParams,
  type ImportCampaignHouseholdsRequest,
  type ReviewSupplyShortageRequest,
  type UpdateCampaignHouseholdRequest,
  type UpdateCampaignHouseholdStatusRequest,
  type UpdateDistributionPointRequest,
  type UpdateReliefPackageDefinitionRequest,
} from '@/services/reliefDistributionService';

export const RELIEF_DISTRIBUTION_KEYS = {
  all: ['relief-distribution'] as const,
  households: (campaignId: string, params?: GetHouseholdsParams) =>
    ['relief-distribution', 'households', campaignId, params] as const,
  checklist: (campaignId: string, params?: GetChecklistParams) =>
    ['relief-distribution', 'checklist', campaignId, params] as const,
  distributionPoints: (campaignId: string, params?: GetDistributionPointsParams) =>
    ['relief-distribution', 'distribution-points', campaignId, params] as const,
  packages: (campaignId: string, params?: GetReliefPackagesParams) =>
    ['relief-distribution', 'packages', campaignId, params] as const,
  deliveries: (campaignId: string, params?: GetDeliveriesParams) =>
    ['relief-distribution', 'deliveries', campaignId, params] as const,
  deliveryDetail: (campaignId: string, householdDeliveryId: string) =>
    ['relief-distribution', 'deliveries', 'detail', campaignId, householdDeliveryId] as const,
  assemblyAvailability: (
    campaignId: string,
    reliefPackageDefinitionId: string,
    params?: GetPackageAssemblyAvailabilityParams,
  ) =>
    [
      'relief-distribution',
      'assembly-availability',
      campaignId,
      reliefPackageDefinitionId,
      params,
    ] as const,
  assemblyHistoryCampaign: (campaignId: string) =>
    ['relief-distribution', 'assembly-history', 'campaign', campaignId] as const,
  assemblyHistoryStation: (campaignId: string, reliefStationId: string) =>
    ['relief-distribution', 'assembly-history', 'station', campaignId, reliefStationId] as const,
  assemblyHistoryDefinition: (campaignId: string, reliefPackageDefinitionId: string) =>
    [
      'relief-distribution',
      'assembly-history',
      'definition',
      campaignId,
      reliefPackageDefinitionId,
    ] as const,
  shortageRequests: (campaignId: string, params?: GetShortageRequestsParams) =>
    ['relief-distribution', 'shortage-requests', campaignId, params] as const,
};

export function useReliefHouseholds(campaignId: string, params?: GetHouseholdsParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.households(campaignId, params),
    queryFn: async () => (await reliefDistributionService.getHouseholds(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    households: query.data?.items ?? [],
    pagination: query.data,
  };
}

export function useReliefChecklist(campaignId: string, params?: GetChecklistParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.checklist(campaignId, params),
    queryFn: async () => (await reliefDistributionService.getChecklist(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    checklist: query.data?.items ?? [],
    pagination: query.data,
  };
}

export function useDistributionPoints(campaignId: string, params?: GetDistributionPointsParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.distributionPoints(campaignId, params),
    queryFn: async () =>
      (await reliefDistributionService.getDistributionPoints(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    distributionPoints: query.data?.items ?? [],
    pagination: query.data,
  };
}

export function useReliefPackages(campaignId: string, params?: GetReliefPackagesParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.packages(campaignId, params),
    queryFn: async () =>
      (await reliefDistributionService.getReliefPackages(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    packages: query.data?.items ?? [],
    pagination: query.data,
  };
}

export function useReliefDeliveries(campaignId: string, params?: GetDeliveriesParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.deliveries(campaignId, params),
    queryFn: async () => (await reliefDistributionService.getDeliveries(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    deliveries: query.data?.items ?? [],
    pagination: query.data,
  };
}

export function useReliefDeliveryDetail(campaignId: string, householdDeliveryId: string) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.deliveryDetail(campaignId, householdDeliveryId),
    queryFn: async () =>
      (await reliefDistributionService.getDeliveryDetail(campaignId, householdDeliveryId)).data,
    enabled: !!campaignId && !!householdDeliveryId,
  });
}

export function usePackageAssemblyAvailability(
  campaignId: string,
  reliefPackageDefinitionId: string,
  params?: GetPackageAssemblyAvailabilityParams,
) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyAvailability(
      campaignId,
      reliefPackageDefinitionId,
      params,
    ),
    queryFn: async () =>
      (
        await reliefDistributionService.getPackageAssemblyAvailability(
          campaignId,
          reliefPackageDefinitionId,
          params as GetPackageAssemblyAvailabilityParams,
        )
      ).data,
    enabled:
      !!campaignId &&
      !!reliefPackageDefinitionId &&
      !!params?.campaignInventoryId &&
      !!params?.reliefStationId,
  });
}

export function usePackageAssemblyHistoryByCampaign(campaignId: string) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryCampaign(campaignId),
    queryFn: async () =>
      (await reliefDistributionService.getPackageAssemblyHistoryByCampaign(campaignId)).data,
    enabled: !!campaignId,
  });
}

export function usePackageAssemblyHistoryByStation(campaignId: string, reliefStationId: string) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryStation(campaignId, reliefStationId),
    queryFn: async () =>
      (
        await reliefDistributionService.getPackageAssemblyHistoryByStation(
          campaignId,
          reliefStationId,
        )
      ).data,
    enabled: !!campaignId && !!reliefStationId,
  });
}

export function useShortageRequests(campaignId: string, params?: GetShortageRequestsParams) {
  const query = useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId, params),
    queryFn: async () =>
      (await reliefDistributionService.getShortageRequests(campaignId, params)).data,
    enabled: !!campaignId,
  });

  return {
    ...query,
    shortageRequests: query.data?.items ?? [],
    pagination: query.data,
  };
}

const invalidateCampaign = async (
  queryClient: ReturnType<typeof useQueryClient>,
  _campaignId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['relief-distribution'] }),
    queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  ]);
};

export function useImportReliefHouseholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: ImportCampaignHouseholdsRequest;
    }) => reliefDistributionService.importHouseholds(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã nhập danh sách hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể nhập danh sách hộ dân'),
  });
}

export function useAssignReliefHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      campaignHouseholdId,
      data,
    }: {
      campaignId: string;
      campaignHouseholdId: string;
      data: AssignHouseholdRequest;
    }) => reliefDistributionService.assignHousehold(campaignId, campaignHouseholdId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã gán hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể gán hộ dân'),
  });
}

export function usePatchReliefHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      campaignHouseholdId,
      data,
    }: {
      campaignId: string;
      campaignHouseholdId: string;
      data: UpdateCampaignHouseholdRequest;
    }) => reliefDistributionService.patchHousehold(campaignId, campaignHouseholdId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã cập nhật hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể cập nhật hộ dân'),
  });
}

export function useDeleteReliefHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      campaignHouseholdId,
    }: {
      campaignId: string;
      campaignHouseholdId: string;
    }) => reliefDistributionService.deleteHousehold(campaignId, campaignHouseholdId),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã xoá hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể xoá hộ dân'),
  });
}

export function useCreateDistributionPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: CreateDistributionPointRequest;
    }) => reliefDistributionService.createDistributionPoint(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã tạo điểm phát');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể tạo điểm phát'),
  });
}

export function usePatchDistributionPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      distributionPointId,
      data,
    }: {
      campaignId: string;
      distributionPointId: string;
      data: UpdateDistributionPointRequest;
    }) => reliefDistributionService.patchDistributionPoint(campaignId, distributionPointId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã cập nhật điểm phát');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể cập nhật điểm phát'),
  });
}

export function useDeleteDistributionPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      distributionPointId,
    }: {
      campaignId: string;
      distributionPointId: string;
    }) => reliefDistributionService.deleteDistributionPoint(campaignId, distributionPointId),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã xoá điểm phát');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể xoá điểm phát'),
  });
}

export function useCreateReliefPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: CreateReliefPackageDefinitionRequest;
    }) => reliefDistributionService.createReliefPackage(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã tạo gói cứu trợ');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể tạo gói cứu trợ'),
  });
}

export function usePatchReliefPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      reliefPackageDefinitionId,
      data,
    }: {
      campaignId: string;
      reliefPackageDefinitionId: string;
      data: UpdateReliefPackageDefinitionRequest;
    }) => reliefDistributionService.patchReliefPackage(campaignId, reliefPackageDefinitionId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã cập nhật gói cứu trợ');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể cập nhật gói cứu trợ'),
  });
}

export function useDeleteReliefPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      reliefPackageDefinitionId,
    }: {
      campaignId: string;
      reliefPackageDefinitionId: string;
    }) => reliefDistributionService.deleteReliefPackage(campaignId, reliefPackageDefinitionId),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã xoá gói cứu trợ');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể xoá gói cứu trợ'),
  });
}

export function useAssembleReliefPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      reliefPackageDefinitionId,
      data,
    }: {
      campaignId: string;
      reliefPackageDefinitionId: string;
      data: AssembleReliefPackageRequest;
    }) =>
      reliefDistributionService.assembleReliefPackage(campaignId, reliefPackageDefinitionId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã đóng gói cứu trợ');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể đóng gói cứu trợ'),
  });
}

export function useCompleteReliefDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      householdDeliveryId,
      data,
    }: {
      campaignId: string;
      householdDeliveryId: string;
      data: CompleteHouseholdDeliveryRequest;
    }) => reliefDistributionService.completeDelivery(campaignId, householdDeliveryId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã hoàn tất phát quà');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể hoàn tất phát quà'),
  });
}

export function useCompleteReliefDeliveryBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: CompleteDeliveriesBatchRequest;
    }) => reliefDistributionService.completeDeliveryBatch(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã hoàn tất phát quà theo lô');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể hoàn tất phát quà theo lô'),
  });
}

export function useCreateShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: CreateSupplyShortageRequest }) =>
      reliefDistributionService.createShortageRequest(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã tạo yêu cầu thiếu hụt');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể tạo yêu cầu thiếu hụt'),
  });
}

export function useApproveShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      shortageRequestId,
      data,
    }: {
      campaignId: string;
      shortageRequestId: string;
      data: ReviewSupplyShortageRequest;
    }) => reliefDistributionService.approveShortageRequest(campaignId, shortageRequestId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã duyệt yêu cầu thiếu hụt');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể duyệt yêu cầu thiếu hụt'),
  });
}

export function useRejectShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      shortageRequestId,
      data,
    }: {
      campaignId: string;
      shortageRequestId: string;
      data: ReviewSupplyShortageRequest;
    }) => reliefDistributionService.rejectShortageRequest(campaignId, shortageRequestId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã từ chối yêu cầu thiếu hụt');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể từ chối yêu cầu thiếu hụt'),
  });
}

export function usePatchReliefHouseholdStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      campaignHouseholdId,
      data,
    }: {
      campaignId: string;
      campaignHouseholdId: string;
      data: UpdateCampaignHouseholdStatusRequest;
    }) => reliefDistributionService.patchHouseholdStatus(campaignId, campaignHouseholdId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã cập nhật trạng thái hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể cập nhật trạng thái hộ dân'),
  });
}
