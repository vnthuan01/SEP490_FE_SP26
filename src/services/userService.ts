import { apiClient } from '@/lib/apiClients';

// === Interfaces ===

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

// === Service ===

export const userService = {
  /** GET /User/profile — lấy profile user đang đăng nhập */
  getProfile: () => apiClient.get<UserProfile>('/User/profile'),

  /** PUT /User/profile — cập nhật profile (multipart/form-data) */
  updateProfile: (data: FormData) =>
    apiClient.put<UserProfile>('/User/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** GET /User/all — admin lấy danh sách users có phân trang */
  getAll: (params?: PaginatedParams) =>
    apiClient.get<PaginatedResponse<UserProfile>>('/User/all', { params }),

  /** GET /User/my-volunteer-profile — Lấy hồ sơ volunteer của user đang đăng nhập */
  getMyVolunteerProfile: () => apiClient.get<any>('/User/my-volunteer-profile'),

  /** PUT /User/{userId}/ban — Admin khóa tài khoản user */
  banUser: (userId: string, data: BanUserPayload) => apiClient.put(`/User/${userId}/ban`, data),

  /** PUT /User/{userId}/unban — Admin mở khóa tài khoản user */
  unbanUser: (userId: string, data: UnbanUserPayload) =>
    apiClient.put(`/User/${userId}/unban`, data),
};
