import { getAuthToken } from '@/lib/cookies';
import { getUserRoleFromToken, decodeJwt } from '@/lib/jwt';
import { type User } from '@/services/authService';
import type { UserRoleType } from '@/enums/UserRole';

export type AuthInfo = {
  isAuthenticated: boolean;
  role: UserRoleType | null;
  user: User | null;
};

/**
 * Hook checkAuth: Lấy auth từ token trực tiếp không cần call API
 */
export function useCheckAuth(): AuthInfo {
  const token = getAuthToken();

  if (!token) {
    return {
      isAuthenticated: false,
      role: null,
      user: null,
    };
  }

  const role = getUserRoleFromToken(token) as UserRoleType | null;
  const decoded = decodeJwt(token);

  const user: User | null = decoded
    ? {
        id: decoded.sub,
        email: decoded.email,
        fullName: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        role: role as any,
      }
    : null;

  return {
    isAuthenticated: !!user,
    role,
    user,
  };
}
