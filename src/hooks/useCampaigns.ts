import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import type {
  Campaign,
  CampaignBudgetTransferResponse,
  CampaignSummary,
  CampaignTeam,
  CampaignInventoryBalance,
  CampaignAssignedVehicle,
  PublicCampaignSummary,
  CreateCampaignPayload,
  ExtractCampaignBudgetRequest,
  UpdateCampaignPayload,
  SearchCampaignParams,
  AssignStationPayload,
  AssignTeamPayload,
  AssignCampaignVehiclePayload,
  UpdateStatusPayload,
  UpdateCampaignVehicleAssignmentPayload,
} from '@/services/campaignService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';
import { parseApiError } from '@/lib/apiErrors';

export const CAMPAIGN_QUERY_KEYS = {
  all: ['campaigns'] as const,
  list: (params?: SearchCampaignParams) => ['campaigns', 'list', params] as const,
  detail: (id: string) => ['campaigns', 'detail', id] as const,
  summary: (id: string) => ['campaigns', 'summary', id] as const,
  inventoryBalance: (id: string) => ['campaigns', 'inventory-balance', id] as const,
  teams: (id: string) => ['campaigns', 'teams', id] as const,
  vehicles: (id: string, campaignTeamId?: string) =>
    ['campaigns', 'vehicles', id, campaignTeamId] as const,
};

// --- Queries --- //

export function useCampaigns(params?: SearchCampaignParams, options?: { enabled?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await campaignService.getAll(params);
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });

  return {
    campaigns: (data?.items || []) as CampaignSummary[],
    pagination: data
      ? {
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          hasPrevious: data.hasPrevious,
          hasNext: data.hasNext,
        }
      : null,
    isLoading,
    isError,
    refetch,
  };
}

export function useCampaign(id: string) {
  const query = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await campaignService.getById(id);
      return response.data as Campaign;
    },
    enabled: !!id,
  });

  return {
    ...query,
    campaign: query.data,
  };
}

export function useCampaignSummary(id: string) {
  const query = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.summary(id),
    queryFn: async () => {
      const response = await campaignService.getSummary(id);
      return response.data as PublicCampaignSummary;
    },
    enabled: !!id,
  });

  return {
    ...query,
    summary: query.data,
  };
}

export function useCampaignInventoryBalance(id: string) {
  const query = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(id),
    queryFn: async () => {
      const response = await campaignService.getInventoryBalance(id);
      return response.data as CampaignInventoryBalance;
    },
    enabled: !!id,
    retry: false,
  });

  const parsedError = query.error
    ? parseApiError(query.error, 'Không thể tải dữ liệu cân đối tồn kho của chiến dịch.')
    : null;

  return {
    ...query,
    inventoryBalance: query.data,
    inventoryBalanceError: parsedError,
  };
}

export function useCampaignTeams(id: string) {
  const query = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.teams(id),
    queryFn: async () => {
      const response = await campaignService.getTeams(id);
      return response.data as CampaignTeam[];
    },
    enabled: !!id,
  });

  return {
    ...query,
    teams: (query.data || []) as CampaignTeam[],
  };
}

export function useCampaignVehicles(id: string, campaignTeamId?: string) {
  const query = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.vehicles(id, campaignTeamId),
    queryFn: async () => {
      const response = await campaignService.getCampaignVehicles(id, campaignTeamId);
      return response.data as CampaignAssignedVehicle[];
    },
    enabled: !!id,
  });

  return {
    ...query,
    vehicles: (query.data || []) as CampaignAssignedVehicle[],
  };
}

// --- Mutations --- //

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignPayload) => campaignService.create(data),
    onSuccess: () => {
      toast.success('Chiến dịch đã được tạo thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo chiến dịch');
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignPayload }) =>
      campaignService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật chiến dịch thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật chiến dịch');
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusPayload }) =>
      campaignService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật trạng thái chiến dịch thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật trạng thái chiến dịch');
    },
  });
}

export function useAssignStationToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignStationPayload }) =>
      campaignService.assignStation(id, data),
    onSuccess: (_, variables) => {
      toast.success('Gán trạm vào chiến dịch thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gán trạm vào chiến dịch');
    },
  });
}

export function useRemoveStationFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reliefStationId }: { id: string; reliefStationId: string }) =>
      campaignService.removeStation(id, reliefStationId),
    onSuccess: (_, variables) => {
      toast.success('Đã gỡ trạm khỏi chiến dịch');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gỡ trạm khỏi chiến dịch');
    },
  });
}

export function useAssignTeamToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTeamPayload }) =>
      campaignService.assignTeam(id, data),
    onSuccess: (_, variables) => {
      toast.success('Gán đội vào chiến dịch thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.teams(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gán đội vào chiến dịch');
    },
  });
}

export function useUpdateCampaignTeamStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, teamId, data }: { id: string; teamId: string; data: UpdateStatusPayload }) =>
      campaignService.updateTeamStatus(id, teamId, data),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật trạng thái đội thành công');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.teams(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật trạng thái đội');
    },
  });
}

export function useRemoveTeamFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId: string }) =>
      campaignService.removeTeam(id, teamId),
    onSuccess: (_, variables) => {
      toast.success('Đã gỡ đội khỏi chiến dịch');
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.teams(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gỡ đội khỏi chiến dịch');
    },
  });
}

export function useAssignCampaignVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      campaignTeamId,
      data,
    }: {
      id: string;
      campaignTeamId: string;
      data: AssignCampaignVehiclePayload;
    }) => campaignService.assignVehicleToTeam(id, campaignTeamId, data),
    onSuccess: async (_, variables) => {
      toast.success('Đã điều phối phương tiện cho đội');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.teams(variables.id) }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.vehicles(variables.id) }),
      ]);
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể điều phối phương tiện cho đội');
    },
  });
}

export function useUpdateCampaignVehicleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      campaignVehicleId,
      data,
    }: {
      id: string;
      campaignVehicleId: string;
      data: UpdateCampaignVehicleAssignmentPayload;
    }) => campaignService.updateCampaignVehicleAssignment(id, campaignVehicleId, data),
    onSuccess: async (_, variables) => {
      toast.success('Đã cập nhật điều phối phương tiện');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.vehicles(variables.id) }),
      ]);
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật điều phối phương tiện');
    },
  });
}

export function useRemoveCampaignVehicleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, campaignVehicleId }: { id: string; campaignVehicleId: string }) =>
      campaignService.removeCampaignVehicleAssignment(id, campaignVehicleId),
    onSuccess: async (_, variables) => {
      toast.success('Đã gỡ điều phối phương tiện');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.vehicles(variables.id) }),
      ]);
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gỡ điều phối phương tiện');
    },
  });
}

export function useExtractCampaignBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExtractCampaignBudgetRequest }) =>
      campaignService.extractBudget(id, data),
    onSuccess: async (response, variables) => {
      const result = response.data as CampaignBudgetTransferResponse;
      toast.success('Đã trích ngân sách sang chiến dịch cứu trợ');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) }),
        queryClient.invalidateQueries({
          queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: CAMPAIGN_QUERY_KEYS.detail(result.targetCampaignId),
        }),
        queryClient.invalidateQueries({
          queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(result.targetCampaignId),
        }),
      ]);
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể trích ngân sách chiến dịch');
    },
  });
}
