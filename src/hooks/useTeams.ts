import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '@/services/teamService';
import type {
  CreateTeamPayload,
  UpdateTeamPayload,
  SearchTeamParams,
  AddTeamMemberPayload,
  CreateTeamJoinRequestPayload,
  ReviewTeamJoinRequestPayload,
} from '@/services/teamService';
import { teamJoinRequestService } from '@/services/teamService';

export const TEAM_QUERY_KEYS = {
  all: ['teams'] as const,
  detail: (id: string) => ['teams', id] as const,
  search: (params: SearchTeamParams) => ['teams', 'search', params] as const,
  myTeams: ['teams', 'my-teams'] as const,
  myTeam: ['teams', 'my-team'] as const,
  members: (id: string) => ['teams', id, 'members'] as const,
  inStation: (stationId: string) => ['teams', 'in-station', stationId] as const,
};

// 1. Main hook for global teams management
export function useTeams(id?: string, searchParams?: SearchTeamParams) {
  const queryClient = useQueryClient();

  const {
    data: teams,
    isLoading: isLoadingTeams,
    isError: isErrorTeams,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: TEAM_QUERY_KEYS.all,
    queryFn: async () => {
      const response = await teamService.getAll();
      return response.data;
    },
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
    enabled: !!id,
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
      return response.data;
    },
    enabled: !!searchParams,
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
    teams: teams || [],
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
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: AddTeamMemberPayload) => teamService.addMember(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
  });

  const promoteToLeaderMutation = useMutation({
    mutationFn: (userId: string) => teamService.promoteToLeader(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => teamService.removeMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(teamId) });
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(teamId) });
    },
  });

  return {
    members: members || [],
    isLoading,
    isError,
    refetch,

    addMember: addMemberMutation.mutateAsync,
    addMemberStatus: addMemberMutation.status,

    promoteToLeader: promoteToLeaderMutation.mutateAsync,
    promoteToLeaderStatus: promoteToLeaderMutation.status,

    removeMember: removeMemberMutation.mutateAsync,
    removeMemberStatus: removeMemberMutation.status,
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
