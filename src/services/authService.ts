import type { UserRoleType } from '@/enums/UserRole';
import { apiClient } from '@/lib/apiClients';

// Auth API Response wrapper
export interface AuthResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// Login
export interface LoginPayload {
  email: string;
  password: string;
}

export interface PhoneLoginPayload {
  phoneNumber: string;
  password: string;
}

export interface LoginResponseData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: string;
}

// Register
export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

// User Profile
export interface User {
  id?: string;
  avatarUrl?: string | null;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  role: UserRoleType;
  status?: string;
  lastActivity?: string;
  location?: string;
}

// Refresh Token
export interface RefreshTokenPayload {
  refreshToken: string;
}

export const authService = {
  login: (data: LoginPayload) => apiClient.post<LoginResponseData>('/Auth/login', data),

  phoneLogin: (data: PhoneLoginPayload) =>
    apiClient.post<LoginResponseData>('/Auth/phone-login', data),

  register: (data: RegisterPayload) => apiClient.post<AuthResponse<string>>('/Auth/register', data),

  me: () => apiClient.get<AuthResponse<User>>('/Auth/me'),

  refreshToken: (data: RefreshTokenPayload) =>
    apiClient.post<LoginResponseData>('/Auth/refresh-token', data),

  // logout: () => apiClient.post('/Auth/logout'),
};
