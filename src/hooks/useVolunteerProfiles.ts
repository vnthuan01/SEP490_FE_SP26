import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerProfileService } from '@/services/volunteerProfileService';
import type {
  CreateVolunteerProfilePayload,
  SearchVolunteerProfileParams,
  SearchVolunteerProfileApplicationsParams,
  UpdateVolunteerProfileSkillsPayload,
} from '@/services/volunteerProfileService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const VOLUNTEER_PROFILE_QUERY_KEYS = {
  all: ['volunteerProfiles'] as const,
  list: (params?: SearchVolunteerProfileParams) => ['volunteerProfiles', 'list', params] as const,
  myProfile: ['volunteerProfiles', 'myProfile'] as const,
  pending: (params?: SearchVolunteerProfileApplicationsParams) =>
    ['volunteerProfiles', 'pending', params] as const,
  review: (params?: SearchVolunteerProfileApplicationsParams) =>
    ['volunteerProfiles', 'review', params] as const,
  mySkills: ['volunteerProfiles', 'mySkills'] as const,
};

export function useVolunteerProfiles(params?: SearchVolunteerProfileParams) {
  const {
    data: profilesData,
    isLoading: isLoadingProfiles,
    isError: isErrorProfiles,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await volunteerProfileService.getAll(params);
      return response.data;
    },
  });

  return {
    profiles: profilesData?.items || [],
    profilesPagination: profilesData
      ? {
          currentPage: profilesData.currentPage,
          totalPages: profilesData.totalPages,
          pageSize: profilesData.pageSize,
          totalCount: profilesData.totalCount,
          hasPrevious: profilesData.hasPrevious,
          hasNext: profilesData.hasNext,
        }
      : null,
    isLoadingProfiles,
    isErrorProfiles,
    refetchProfiles,
  };
}

export function useMyVolunteerProfileInfo() {
  return useQuery({
    queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.myProfile,
    queryFn: async () => {
      const response = await volunteerProfileService.getMyProfile();
      return response.data;
    },
  });
}

export function usePendingApplications(params?: SearchVolunteerProfileApplicationsParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.pending(params),
    queryFn: async () => {
      const response = await volunteerProfileService.getPendingApplications(params);
      return response.data;
    },
  });

  return {
    applications: data?.items || [],
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

export function useReviewApplications(params?: SearchVolunteerProfileApplicationsParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.review(params),
    queryFn: async () => {
      const response = await volunteerProfileService.getReviewApplications(params);
      return response.data;
    },
  });

  return {
    applications: data?.items || [],
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

export function useMyVolunteerSkills() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.mySkills,
    queryFn: async () => {
      const response = await volunteerProfileService.getMySkills();
      return response.data;
    },
  });

  return {
    skills: data || [],
    isLoading,
    isError,
    refetch,
  };
}

export function useCreateVolunteerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVolunteerProfilePayload) => volunteerProfileService.create(data),
    onSuccess: () => {
      toast.success('Hồ sơ tình nguyện viên đã được tạo');
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['user', 'volunteerProfile'] });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể tạo hồ sơ tình nguyện viên');
    },
  });
}

export function useApproveVolunteerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => volunteerProfileService.approve(id),
    onSuccess: () => {
      toast.success('Đã duyệt hồ sơ');
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể duyệt hồ sơ tình nguyện viên');
    },
  });
}

export function useRejectVolunteerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      volunteerProfileService.reject(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối hồ sơ');
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể từ chối hồ sơ tình nguyện viên');
    },
  });
}

export function useAddVolunteerSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateVolunteerProfileSkillsPayload) =>
      volunteerProfileService.addSkills(data),
    onSuccess: () => {
      toast.success('Đã thêm kỹ năng thành công');
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.mySkills });
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.myProfile });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể thêm kỹ năng');
    },
  });
}

export function useRemoveVolunteerSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateVolunteerProfileSkillsPayload) =>
      volunteerProfileService.removeSkills(data),
    onSuccess: () => {
      toast.success('Đã xóa kỹ năng thành công');
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.mySkills });
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.myProfile });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể xóa kỹ năng');
    },
  });
}
