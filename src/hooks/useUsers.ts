import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import type { ModeratorPaginatedParams, PaginatedParams } from '@/services/userService';

// === Query Keys ===

export const USER_QUERY_KEYS = {
  profile: ['user', 'profile'] as const,
  volunteerProfile: ['user', 'volunteerProfile'] as const,
  all: (params?: PaginatedParams) => ['users', 'all', params] as const,
  moderators: (params?: ModeratorPaginatedParams) => ['users', 'moderators', params] as const,
};

// === 1. Hook cho profile user đang đăng nhập ===

export function useUserProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: USER_QUERY_KEYS.profile,
    queryFn: async () => {
      const response = await userService.getProfile();
      return response.data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: FormData) => userService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
    },
  });

  return {
    profile: profile || null,
    isLoading,
    isError,
    refetch,

    updateProfile: updateProfileMutation.mutateAsync,
    updateProfileStatus: updateProfileMutation.status,
  };
}

// === 2. Hook cho admin lấy danh sách tất cả users ===

export function useAllUsers(params?: PaginatedParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: USER_QUERY_KEYS.all(params),
    queryFn: async () => {
      const response = await userService.getAll(params);
      return response.data;
    },
  });

  return {
    users: data?.items || [],
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

export function useModerators(params?: ModeratorPaginatedParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: USER_QUERY_KEYS.moderators(params),
    queryFn: async () => {
      const response = await userService.getModerators(params);
      return response.data;
    },
  });

  return {
    moderators: data?.items || [],
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

// === 3. Additional Admin and Profile Hooks ===

export function useMyVolunteerProfile() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.volunteerProfile,
    queryFn: async () => {
      const response = await userService.getMyVolunteerProfile();
      return response.data;
    },
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { reason: string } }) =>
      userService.banUser(userId, data),
    onSuccess: () => {
      // Invalidate all related lists
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { note: string } }) =>
      userService.unbanUser(userId, data),
    onSuccess: () => {
      // Invalidate all related lists
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
