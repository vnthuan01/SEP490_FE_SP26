import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import { authService } from '@/services/authService';
import type {
  LoginPayload,
  PhoneLoginPayload,
  RegisterPayload,
  User,
  AuthResponse,
  LoginResponseData,
  ChangePasswordPayload,
} from '@/services/authService';
import { getAuthToken, setAuthToken, clearAuthToken, setRefreshToken } from '@/lib/cookies';
import { decodeJwt } from '@/lib/jwt';
import type { UserRoleType } from '@/enums/UserRole';

export function useAuth() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  // Parse user profile directly from token instead of calling /api/Auth/me
  const isAuthLoading = false; // Never loading profile anymore
  let profile: User | null = null;

  if (token) {
    const decoded = decodeJwt(token);
    if (decoded) {
      profile = {
        id: decoded.sub,
        email: decoded.email,
        fullName: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        role: decoded[
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
        ] as UserRoleType,
      } as User;
    }
  }

  // Login
  const loginMutation = useMutation<AxiosResponse<LoginResponseData>, unknown, LoginPayload>({
    mutationFn: (data: LoginPayload) => authService.login(data),
    onSuccess: (res: AxiosResponse<LoginResponseData>) => {
      const { accessToken, refreshToken } = res.data;
      if (accessToken) {
        setAuthToken(accessToken);
        if (refreshToken) {
          setRefreshToken(refreshToken);
        }
      }
    },
  });

  // Phone Login
  const phoneLoginMutation = useMutation<
    AxiosResponse<LoginResponseData>,
    unknown,
    PhoneLoginPayload
  >({
    mutationFn: (data: PhoneLoginPayload) => authService.phoneLogin(data),
    onSuccess: (res: AxiosResponse<LoginResponseData>) => {
      const { accessToken, refreshToken } = res.data;
      if (accessToken) {
        setAuthToken(accessToken);
        if (refreshToken) {
          setRefreshToken(refreshToken);
        }
      }
    },
  });

  // Register
  const registerMutation = useMutation<
    AxiosResponse<AuthResponse<string>>,
    unknown,
    RegisterPayload
  >({
    mutationFn: (data: RegisterPayload) => authService.register(data),
  });

  const changePasswordMutation = useMutation<
    AxiosResponse<AuthResponse<string>>,
    unknown,
    ChangePasswordPayload
  >({
    mutationFn: (data: ChangePasswordPayload) => authService.changePassword(data),
  });
  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearAuthToken();
      // Optional: clear any queries if needed
      queryClient.clear();
    },
  });

  return {
    user: profile,
    role: profile?.role || null,
    isAuthenticated: !!profile,
    isLoading: isAuthLoading,
    login: loginMutation.mutateAsync,
    phoneLogin: phoneLoginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginStatus: loginMutation.status,
    phoneLoginStatus: phoneLoginMutation.status,
    registerStatus: registerMutation.status,
    changePassword: changePasswordMutation.mutateAsync,
    changePasswordStatus: changePasswordMutation.status,
  };
}
