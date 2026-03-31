import { apiClient } from '@/lib/apiClients';

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  pictureUrl: string | null;
  banReason: string | null;
  isBanned: boolean;
  lockoutEnd: string | null;
  roles: string[];
}

export interface UpdateProfilePayload {
  displayName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  pictureUrl?: string;
  picturePublicId?: string;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface PaginatedParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  isBanned?: boolean;
}

export interface BanUserPayload {
  reason: string;
}

export interface UnbanUserPayload {
  note: string;
}

export interface UserResponse<T> {
  displayName: string;
  email: string;
  phoneNumber: string;
  role: [string];
  data: T;
}

export const userService = {
  getProfile: () => apiClient.get<UserProfile>('/User/profile'),

  updateProfile: (data: FormData) =>
    apiClient.put<UserProfile>('/User/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (params?: PaginatedParams) =>
    apiClient.get<PaginatedResponse<UserProfile>>('/User/all', { params }),

  getMyVolunteerProfile: () => apiClient.get<any>('/User/my-volunteer-profile'),

  banUser: (userId: string, data: BanUserPayload) => apiClient.put(`/User/${userId}/ban`, data),

  unbanUser: (userId: string, data: UnbanUserPayload) =>
    apiClient.put(`/User/${userId}/unban`, data),
};

export const getCurrentUserProfile = async () => {
  const res = await apiClient.get('/Auth/me');
  return res.data;
};

export const getMyProfile = getCurrentUserProfile;
