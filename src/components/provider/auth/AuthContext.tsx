import { type ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import {
  authService,
  type LoginPayload,
  type PhoneLoginPayload,
  type User,
} from '@/services/authService';
import { AuthContext } from './AuthContextType';
import { getAuthToken, setAuthToken, setRefreshToken, clearAuthToken } from '@/lib/cookies';
import { decodeJwt, getUserRoleFromToken } from '@/lib/jwt';
import type { UserRoleType } from '@/enums/UserRole';
import { registerTokenUpdateCallback, unregisterTokenUpdateCallback } from '@/lib/tokenBridge';
import { useQueryClient } from '@tanstack/react-query';

type AuthProviderProps = { children: ReactNode };

const LOGOUT_STORAGE_KEYS = [
  'coordinator-create-item-draft',
  'coordinator-transfer-request-draft',
  'coordinator-edit-stock-draft',
  'coordinator-campaign-allocation-draft',
  'campaign_create_draft',
];

/** Parse a User from a JWT string, or return null */
function parseUserFromToken(token: string | null): User | null {
  if (!token) return null;
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  const role = getUserRoleFromToken(token);
  return {
    id: decoded.sub,
    email: decoded.email,
    fullName: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    role: (role as UserRoleType | null) ?? undefined,
  } as User;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Store the token in React state so changes trigger re-renders
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const queryClient = useQueryClient();

  const user = useMemo(() => parseUserFromToken(token), [token]);

  // Kết nối tokenBridge: interceptor axios có thể cập nhật React state khi refresh token
  useEffect(() => {
    registerTokenUpdateCallback((newAccessToken, newRefreshToken) => {
      setToken(newAccessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
    });
    return () => {
      unregisterTokenUpdateCallback();
    };
  }, []);

  const login = useCallback(async (data: LoginPayload) => {
    const res = await authService.login(data);
    const { accessToken, refreshToken } = res.data;
    if (accessToken) {
      setAuthToken(accessToken);
      setToken(accessToken); // ← triggers re-render
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
    }
    return res;
  }, []);

  const phoneLogin = useCallback(async (data: PhoneLoginPayload) => {
    const res = await authService.phoneLogin(data);
    const { accessToken, refreshToken } = res.data;
    if (accessToken) {
      setAuthToken(accessToken);
      setToken(accessToken); // ← triggers re-render
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Best-effort server logout; continue local cleanup regardless.
    } finally {
      clearAuthToken();
      LOGOUT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      queryClient.clear();
      setToken(null); // ← triggers re-render
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: false,
        login,
        phoneLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
