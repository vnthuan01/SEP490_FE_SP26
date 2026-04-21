import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { teamService } from '@/services/teamService';
import { rescueRequestService } from '@/services/rescueRequestService';
import type {
  CreateTeamPayload,
  UpdateTeamPayload,
  SearchTeamParams,
  AddTeamMemberPayload,
  AddTeamMembersBulkPayload,
  CreateTeamJoinRequestPayload,
  ReviewTeamJoinRequestPayload,
  PagedResponse,
  Team,
} from '@/services/teamService';
import { teamJoinRequestService } from '@/services/teamService';
import { handleHookError } from './hookErrorUtils';
import { toast } from 'sonner';
import { RescueBatchItemStatus } from '@/enums/beEnums';

export interface ActiveBatchVehicleInfo {
  vehicleId: string;
  vehicleName?: string | null;
  vehicleLicensePlate?: string | null;
}

export const TEAM_QUERY_KEYS = {
  all: ['teams'] as const,
  detail: (id: string) => ['teams', id] as const,
  search: (params: SearchTeamParams) => ['teams', 'search', params] as const,
  myTeams: ['teams', 'my-teams'] as const,
  myTeam: ['teams', 'my-team'] as const,
  members: (id: string) => ['teams', id, 'members'] as const,
  inStation: (stationId: string) => ['teams', 'in-station', stationId] as const,
  latestTracking: (id: string, limit: number) =>
    ['teams', id, 'tracking', 'latest', limit] as const,
};

// 1. Main hook for global teams management
export function useTeams(
  id?: string,
  searchParams?: SearchTeamParams,
  options?: { enabledList?: boolean; enabledDetail?: boolean; enabledSearch?: boolean },
) {
  const queryClient = useQueryClient();

  const {
    data: teamsData,
    isLoading: isLoadingTeams,
    isError: isErrorTeams,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: TEAM_QUERY_KEYS.all,
    queryFn: async () => {
      const response = await teamService.getAll();
      const data = response.data as Team[] | PagedResponse<Team>;
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: options?.enabledList ?? true,
  });

  const {
    data: team,
    isLoading: isLoadingTeam,
    isError: isErrorTeam,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: id ? TEAM_QUERY_KEYS.detail(id) : [],
    queryFn: async () => {
      if (!id) throw new Error('Team ID is required');
      const response = await teamService.getById(id);
      return response.data;
    },
    enabled: (options?.enabledDetail ?? true) && !!id,
  });

  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: searchParams ? TEAM_QUERY_KEYS.search(searchParams) : [],
    queryFn: async () => {
      if (!searchParams) throw new Error('Search params required');
      const response = await teamService.search(searchParams);
      return response.data?.items || [];
    },
    enabled: (options?.enabledSearch ?? true) && !!searchParams,
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamPayload) => teamService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.myTeams });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamPayload }) =>
      teamService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.myTeams });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => teamService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.myTeams });
    },
  });

  return {
    // Queries
    teams: teamsData || [],
    teamsPaging: undefined,
    isLoadingTeams,
    isErrorTeams,
    refetchTeams,

    team,
    isLoadingTeam,
    isErrorTeam,
    refetchTeam,

    searchResults,
    isLoadingSearch,
    refetchSearch,

    // Mutations
    createTeam: createTeamMutation.mutateAsync,
    createStatus: createTeamMutation.status,

    updateTeam: updateTeamMutation.mutateAsync,
    updateStatus: updateTeamMutation.status,

    deleteTeam: deleteTeamMutation.mutateAsync,
    deleteStatus: deleteTeamMutation.status,
  };
}

// 2. Hook cho Moderator lấy danh sách teams đang quản lý
export function useMyTeams() {
  const {
    data: myTeams,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: TEAM_QUERY_KEYS.myTeams,
    queryFn: async () => {
      const response = await teamService.getMyTeams();
      return response.data;
    },
  });

  return { myTeams, isLoading, isError, refetch };
}

// 3. Hook lấy danh sách team theo trạm cứu trợ
export function useTeamsInStation(stationId?: string) {
  const {
    data: pagedTeams,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: stationId ? TEAM_QUERY_KEYS.inStation(stationId) : [],
    queryFn: async () => {
      if (!stationId) throw new Error('ReliefStationId is required');
      const response = await teamService.getTeamsInStation(stationId);
      return response.data;
    },
    enabled: !!stationId,
  });

  return {
    teams: pagedTeams?.items || [],
    paging: pagedTeams,
    isLoading,
    isError,
    refetch,
  };
}

// 4. Hook cho Volunteer lấy team hiện tại của mình
export function useMyTeam() {
  const {
    data: myTeam,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: TEAM_QUERY_KEYS.myTeam,
    queryFn: async () => {
      const response = await teamService.getMyTeam();
      return response.data;
    },
  });

  return { myTeam, isLoading, isError, refetch };
}

// 5. Hook quản lý members trong 1 team cụ thể
export function useTeamMembers(teamId: string) {
  const queryClient = useQueryClient();

  const {
    data: members,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: TEAM_QUERY_KEYS.members(teamId),
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      const response = await teamService.getMembers(teamId);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: AddTeamMemberPayload) => teamService.addMember(teamId, data),
    onSuccess: () => {
      toast.success('Đã thêm thành viên vào đội');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể thêm thành viên vào đội');
    },
  });

  const addMembersBulkMutation = useMutation({
    mutationFn: (data: AddTeamMembersBulkPayload) => teamService.addMembersBulk(teamId, data),
    onSuccess: () => {
      toast.success('Đã thêm nhiều thành viên vào đội');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể thêm nhiều thành viên vào đội');
    },
  });

  const promoteToLeaderMutation = useMutation({
    mutationFn: (userId: string) => teamService.promoteToLeader(teamId, userId),
    onSuccess: () => {
      toast.success('Đã cập nhật trưởng nhóm');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể cập nhật trưởng nhóm');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => teamService.removeMember(teamId, userId),
    onSuccess: () => {
      toast.success('Đã xóa thành viên khỏi đội');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể xóa thành viên khỏi đội');
    },
  });

  return {
    members: members || [],
    isLoading,
    isError,
    refetch,

    addMember: addMemberMutation.mutateAsync,
    addMemberStatus: addMemberMutation.status,

    addMembersBulk: addMembersBulkMutation.mutateAsync,
    addMembersBulkStatus: addMembersBulkMutation.status,

    promoteToLeader: promoteToLeaderMutation.mutateAsync,
    promoteToLeaderStatus: promoteToLeaderMutation.status,

    removeMember: removeMemberMutation.mutateAsync,
    removeMemberStatus: removeMemberMutation.status,
  };
}

export function useTeamLatestTracking(teamId: string, limit = 100) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: TEAM_QUERY_KEYS.latestTracking(teamId, limit),
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      const response = await teamService.getTrackingPoints(teamId, limit);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    trackingPoints: data || [],
    isLoading,
    isError,
    refetch,
  };
}

// === Team Join Request Hooks ===

export const TEAM_JOIN_REQUEST_QUERY_KEYS = {
  all: ['teamJoinRequests'] as const,
  detail: (id: string) => ['teamJoinRequests', id] as const,
  myRequests: ['teamJoinRequests', 'my-requests'] as const,
  byTeam: (teamId: string) => ['teamJoinRequests', 'team', teamId] as const,
};

// Hook for Volunteers to manage their join requests
export function useMyTeamJoinRequests() {
  const queryClient = useQueryClient();

  const {
    data: myRequests,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: TEAM_JOIN_REQUEST_QUERY_KEYS.myRequests,
    queryFn: async () => {
      const response = await teamJoinRequestService.getMyRequests();
      return response.data;
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: CreateTeamJoinRequestPayload) => teamJoinRequestService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_JOIN_REQUEST_QUERY_KEYS.myRequests });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (id: string) => teamJoinRequestService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_JOIN_REQUEST_QUERY_KEYS.myRequests });
    },
  });

  return {
    myRequests: myRequests || [],
    isLoading,
    isError,
    refetch,

    createRequest: createRequestMutation.mutateAsync,
    createRequestStatus: createRequestMutation.status,

    cancelRequest: cancelRequestMutation.mutateAsync,
    cancelRequestStatus: cancelRequestMutation.status,
  };
}

// Hook for Moderators to manage join requests for their team
export function useTeamJoinRequests(teamId?: string) {
  const queryClient = useQueryClient();

  const {
    data: teamRequests,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: teamId ? TEAM_JOIN_REQUEST_QUERY_KEYS.byTeam(teamId) : [],
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      const response = await teamJoinRequestService.getRequestsByTeam(teamId);
      return response.data;
    },
    enabled: !!teamId,
  });

  const approveRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewTeamJoinRequestPayload }) =>
      teamJoinRequestService.approve(id, data),
    onSuccess: () => {
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: TEAM_JOIN_REQUEST_QUERY_KEYS.byTeam(teamId) });
        // Also invalidate team members since a new member was added
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      }
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewTeamJoinRequestPayload }) =>
      teamJoinRequestService.reject(id, data),
    onSuccess: () => {
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: TEAM_JOIN_REQUEST_QUERY_KEYS.byTeam(teamId) });
      }
    },
  });

  return {
    teamRequests: teamRequests || [],
    isLoading,
    isError,
    refetch,

    approveRequest: approveRequestMutation.mutateAsync,
    approveRequestStatus: approveRequestMutation.status,

    rejectRequest: rejectRequestMutation.mutateAsync,
    rejectRequestStatus: rejectRequestMutation.status,
  };
}

/**
 * Lấy active-batch của nhiều team song song.
 * Rule cho TeamAllocation: chỉ chặn team khi batch có item InProgress.
 * Nếu batch chỉ toàn Pending/Assigned thì vẫn cho phân công thêm.
 */
export function useTeamsActiveBatches(teamIds: string[]) {
  const results = useQueries({
    queries: teamIds.map((teamId) => ({
      queryKey: ['teams', teamId, 'active-batch'] as const,
      queryFn: () => rescueRequestService.getActiveBatch(teamId),
      staleTime: 10_000,
      retry: false,
    })),
  });

  const busyTeamIds = new Set<string>();
  const dispatchedVehicleByTeamId: Record<string, ActiveBatchVehicleInfo> = {};
  results.forEach((result, index) => {
    const batch = result.data;
    if (!batch) return;

    const batchVehicle = (batch.items || []).find((item: any) =>
      String(item?.vehicleId || '').trim(),
    ) as any | undefined;
    if (batchVehicle?.vehicleId) {
      dispatchedVehicleByTeamId[teamIds[index]] = {
        vehicleId: String(batchVehicle.vehicleId),
        vehicleName: batchVehicle.vehicleName ?? null,
        vehicleLicensePlate: batchVehicle.vehicleLicensePlate ?? null,
      };
    }

    const hasInProgressItem = (batch.items || []).some((item) => {
      const requestStatus = String((item as any)?.rescueRequestStatus ?? '')
        .trim()
        .toLowerCase();
      if (requestStatus) {
        return requestStatus === 'inprogress' || requestStatus === 'in_progress';
      }

      const rawStatus = item?.status;
      const numericStatus = Number(rawStatus);
      if (Number.isFinite(numericStatus)) {
        return numericStatus === RescueBatchItemStatus.InProgress;
      }

      const normalizedStatus = String(rawStatus ?? '')
        .trim()
        .toLowerCase();
      return normalizedStatus === 'inprogress' || normalizedStatus === 'in_progress';
    });

    if (hasInProgressItem) busyTeamIds.add(teamIds[index]);
  });

  const isLoading = results.some((r) => r.isLoading);

  return { busyTeamIds, dispatchedVehicleByTeamId, isLoading };
}
