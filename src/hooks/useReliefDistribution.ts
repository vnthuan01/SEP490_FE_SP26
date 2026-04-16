import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';
import {
  reliefDistributionService,
  type AssembleReliefPackageRequest,
  type AssignHouseholdRequest,
  type CompleteHouseholdDeliveryRequest,
  type CreateDistributionPointRequest,
  type CreateReliefPackageDefinitionRequest,
  type CreateSupplyShortageRequest,
  type GetChecklistParams,
  type GetHouseholdsParams,
  type GetPackageAssemblyAvailabilityParams,
  type GetShortageRequestsParams,
  type ImportCampaignHouseholdsRequest,
  type ReviewSupplyShortageRequest,
} from '@/services/reliefDistributionService';

export const RELIEF_DISTRIBUTION_KEYS = {
  all: ['relief-distribution'] as const,
  households: (campaignId: string, params?: GetHouseholdsParams) =>
    ['relief-distribution', 'households', campaignId, params] as const,
  checklist: (campaignId: string, params?: GetChecklistParams) =>
    ['relief-distribution', 'checklist', campaignId, params] as const,
  distributionPoints: (campaignId: string) =>
    ['relief-distribution', 'distribution-points', campaignId] as const,
  packages: (campaignId: string) => ['relief-distribution', 'packages', campaignId] as const,
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
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.households(campaignId, params),
    queryFn: async () => (await reliefDistributionService.getHouseholds(campaignId, params)).data,
    enabled: !!campaignId,
  });
}

export function useReliefChecklist(campaignId: string, params?: GetChecklistParams) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.checklist(campaignId, params),
    queryFn: async () => (await reliefDistributionService.getChecklist(campaignId, params)).data,
    enabled: !!campaignId,
  });
}

export function useDistributionPoints(campaignId: string) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.distributionPoints(campaignId),
    queryFn: async () => (await reliefDistributionService.getDistributionPoints(campaignId)).data,
    enabled: !!campaignId,
  });
}

export function useReliefPackages(campaignId: string) {
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.packages(campaignId),
    queryFn: async () => (await reliefDistributionService.getReliefPackages(campaignId)).data,
    enabled: !!campaignId,
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
      !!params?.inventoryId &&
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
  return useQuery({
    queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId, params),
    queryFn: async () =>
      (await reliefDistributionService.getShortageRequests(campaignId, params)).data,
    enabled: !!campaignId,
  });
}

const invalidateCampaign = async (
  queryClient: ReturnType<typeof useQueryClient>,
  campaignId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: RELIEF_DISTRIBUTION_KEYS.households(campaignId) }),
    queryClient.invalidateQueries({ queryKey: RELIEF_DISTRIBUTION_KEYS.checklist(campaignId) }),
    queryClient.invalidateQueries({
      queryKey: RELIEF_DISTRIBUTION_KEYS.distributionPoints(campaignId),
    }),
    queryClient.invalidateQueries({ queryKey: RELIEF_DISTRIBUTION_KEYS.packages(campaignId) }),
    queryClient.invalidateQueries({
      queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId),
    }),
    queryClient.invalidateQueries({
      queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryCampaign(campaignId),
    }),
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
      toast.success('Đã import danh sách hộ dân');
      await invalidateCampaign(queryClient, campaignId);
    },
    onError: (error) => handleHookError(error, 'Không thể import hộ dân'),
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
      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.distributionPoints(campaignId),
      });
    },
    onError: (error) => handleHookError(error, 'Không thể tạo điểm phát'),
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
      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.packages(campaignId),
      });
    },
    onError: (error) => handleHookError(error, 'Không thể tạo gói cứu trợ'),
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
    onSuccess: async (_, { campaignId, reliefPackageDefinitionId, data }) => {
      toast.success('Đã đóng gói cứu trợ');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryCampaign(campaignId),
        }),
        queryClient.invalidateQueries({
          queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryStation(
            campaignId,
            data.reliefStationId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyHistoryDefinition(
            campaignId,
            reliefPackageDefinitionId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyAvailability(
            campaignId,
            reliefPackageDefinitionId,
          ),
        }),
      ]);
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

export function useCreateShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: CreateSupplyShortageRequest }) =>
      reliefDistributionService.createShortageRequest(campaignId, data),
    onSuccess: async (_, { campaignId }) => {
      toast.success('Đã tạo yêu cầu thiếu hụt');
      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId),
      });
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
      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId),
      });
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
      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.shortageRequests(campaignId),
      });
    },
    onError: (error) => handleHookError(error, 'Không thể từ chối yêu cầu thiếu hụt'),
  });
}
