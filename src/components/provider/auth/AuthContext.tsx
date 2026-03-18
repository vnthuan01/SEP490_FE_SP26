import { type ReactNode, useState, useCallback, useMemo } from 'react';
import {
  authService,
  type LoginPayload,
  type PhoneLoginPayload,
  type User,
} from '@/services/authService';
import { AuthContext } from './AuthContextType';
import { getAuthToken, setAuthToken, setRefreshToken, clearAuthToken } from '@/lib/cookies';
import { decodeJwt } from '@/lib/jwt';
import type { UserRoleType } from '@/enums/UserRole';

type AuthProviderProps = { children: ReactNode };

/** Parse a User from a JWT string, or return null */
function parseUserFromToken(token: string | null): User | null {
  if (!token) return null;
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  return {
    id: decoded.sub,
    email: decoded.email,
    fullName: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as UserRoleType,
  } as User;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Store the token in React state so changes trigger re-renders
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const user = useMemo(() => parseUserFromToken(token), [token]);

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

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null); // ← triggers re-render
  }, []);

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
