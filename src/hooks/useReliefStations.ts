import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reliefStationService,
  type SearchProvincialStationParams,
  type CreateProvincialStationPayload,
  type UpdateProvincialStationPayload,
  type AssignModeratorPayload,
  type AssignTeamPayload,
  type UpdateTeamStatusPayload,
  stationJoinRequestService,
  type CreateStationJoinRequestPayload,
  type ReviewStationJoinRequestPayload,
  type GetMyStationJoinRequestsParams,
  type GetPendingStationJoinRequestsParams,
} from '@/services/reliefStationService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const RELIEF_STATION_KEYS = {
  all: ['relief-stations'] as const,
  provincial: (params: SearchProvincialStationParams) =>
    [...RELIEF_STATION_KEYS.all, 'provincial', params] as const,
  myStation: () => [...RELIEF_STATION_KEYS.all, 'my-station'] as const,
};

export const useProvincialStations = (params: SearchProvincialStationParams) => {
  return useQuery({
    queryKey: RELIEF_STATION_KEYS.provincial(params),
    queryFn: async () => {
      const response = await reliefStationService.getProvincialStations(params);
      return response.data;
    },
  });
};

export const useMyStation = () => {
  return useQuery({
    queryKey: RELIEF_STATION_KEYS.myStation(),
    queryFn: async () => {
      const response = await reliefStationService.getMyStation();
      return response.data;
    },
  });
};

export const useCreateProvincialStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProvincialStationPayload) =>
      reliefStationService.createProvincialStation(data),
    onSuccess: () => {
      toast.success('Tạo trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo trạm');
    },
  });
};

export const useUpdateProvincialStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stationId,
      data,
    }: {
      stationId: string;
      data: UpdateProvincialStationPayload;
    }) => reliefStationService.updateProvincialStation(stationId, data),
    onSuccess: () => {
      toast.success('Cập nhật thông tin trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật trạm');
    },
  });
};

export const useDisableProvincialStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationId: string) => reliefStationService.disableProvincialStation(stationId),
    onSuccess: () => {
      toast.success('Đã vô hiệu hoá trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể vô hiệu hóa trạm');
    },
  });
};

export const useActivateProvincialStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationId: string) => reliefStationService.activateProvincialStation(stationId),
    onSuccess: () => {
      toast.success('Đã kích hoạt lại trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể kích hoạt trạm');
    },
  });
};

export const useAssignModeratorToStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stationId, data }: { stationId: string; data: AssignModeratorPayload }) =>
      reliefStationService.assignModerator(stationId, data),
    onSuccess: () => {
      toast.success('Gán người quản lý trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gán quản lý cho trạm / Trạm đã có người quản lý');
    },
  });
};

export const useAssignTeamToStation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stationId, data }: { stationId: string; data: AssignTeamPayload }) =>
      reliefStationService.assignTeam(stationId, data),
    onSuccess: () => {
      toast.success('Duyệt/Gán đội vào trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gán đội vào trạm');
    },
  });
};

export const useUpdateStationTeamStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stationId,
      teamId,
      data,
    }: {
      stationId: string;
      teamId: string;
      data: UpdateTeamStatusPayload;
    }) => reliefStationService.updateTeamStatus(stationId, teamId, data),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái đội tại trạm thành công');
      queryClient.invalidateQueries({ queryKey: RELIEF_STATION_KEYS.all });
    },
  });
};

// ==========================================
// STATION JOIN REQUEST HOOKS
// ==========================================

export const STATION_JOIN_REQUEST_KEYS = {
  all: ['station-join-requests'] as const,
  mine: (params: GetMyStationJoinRequestsParams) =>
    [...STATION_JOIN_REQUEST_KEYS.all, 'mine', params] as const,
  pending: (stationId: string, params: GetPendingStationJoinRequestsParams) =>
    [...STATION_JOIN_REQUEST_KEYS.all, 'pending', stationId, params] as const,
  detail: (id: string) => [...STATION_JOIN_REQUEST_KEYS.all, 'detail', id] as const,
};

export const useCreateStationJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStationJoinRequestPayload) => stationJoinRequestService.create(data),
    onSuccess: () => {
      toast.success('Gửi yêu cầu xin vào trạm thành công');
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể gửi yêu cầu vào trạm');
    },
  });
};

export const useStationJoinRequest = (id: string) => {
  return useQuery({
    queryKey: STATION_JOIN_REQUEST_KEYS.detail(id),
    queryFn: async () => {
      const response = await stationJoinRequestService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useMyStationJoinRequests = (params: GetMyStationJoinRequestsParams) => {
  return useQuery({
    queryKey: STATION_JOIN_REQUEST_KEYS.mine(params),
    queryFn: async () => {
      const response = await stationJoinRequestService.getMyRequests(params);
      return response.data;
    },
  });
};

export const useCancelStationJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => stationJoinRequestService.cancel(id),
    onSuccess: (_, id) => {
      toast.success('Đã huỷ yêu cầu thành công');
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.detail(id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể hủy yêu cầu vào trạm');
    },
  });
};

export const usePendingStationJoinRequests = (
  stationId: string,
  params: GetPendingStationJoinRequestsParams,
) => {
  return useQuery({
    queryKey: STATION_JOIN_REQUEST_KEYS.pending(stationId, params),
    queryFn: async () => {
      const response = await stationJoinRequestService.getPendingRequests(stationId, params);
      return response.data;
    },
    enabled: !!stationId,
  });
};

export const useApproveStationJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewStationJoinRequestPayload }) =>
      stationJoinRequestService.approve(id, data),
    onSuccess: (_, { id }) => {
      toast.success('Duyệt yêu cầu thành công');
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.detail(id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể duyệt yêu cầu vào trạm');
    },
  });
};

export const useRejectStationJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewStationJoinRequestPayload }) =>
      stationJoinRequestService.reject(id, data),
    onSuccess: (_, { id }) => {
      toast.success('Đã từ chối yêu cầu');
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STATION_JOIN_REQUEST_KEYS.detail(id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể từ chối yêu cầu vào trạm');
    },
  });
};
