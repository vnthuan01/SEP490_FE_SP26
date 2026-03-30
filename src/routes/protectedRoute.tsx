import { Navigate } from 'react-router-dom';
import { useContext, type ReactNode } from 'react';
import { AuthContext } from '@/components/provider/auth/AuthContextType';
import { type UserRoleType } from '@/enums/UserRole';
import { getHomeByRole } from '@/lib/utils';
type RoleBasedRouteProps = {
  element: ReactNode;
  roles?: UserRoleType[];
};

export default function RoleBasedRoute({ element, roles = [] }: RoleBasedRouteProps) {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  const authDebug = import.meta.env.DEV;

  if (authDebug) {
    console.log('[AUTH_DEBUG][RoleBasedRoute] evaluate', {
      roles,
      isLoading,
      isAuthenticated,
      userRole: user?.role,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Not authenticated → redirect to login (only for routes that require roles)
  if (!isAuthenticated || !user) {
    if (roles.length > 0) {
      if (authDebug) {
        console.log('[AUTH_DEBUG][RoleBasedRoute] redirect -> /login (unauth protected)');
      }
      return <Navigate to="/login" replace />;
    }
    // No roles required (public route like /login) → render as-is
    return element;
  }

  // Authenticated but route has no roles (e.g. /login, /) → redirect to home
  if (roles.length === 0) {
    if (authDebug) {
      console.log('[AUTH_DEBUG][RoleBasedRoute] redirect -> home (public route hit while auth)', {
        home: getHomeByRole(user.role),
      });
    }
    return <Navigate to={getHomeByRole(user.role)} replace />;
  }

  // Authenticated but wrong role → redirect to their home
  if (!roles.includes(user.role)) {
    if (authDebug) {
      console.log('[AUTH_DEBUG][RoleBasedRoute] redirect -> home (role mismatch)', {
        allowedRoles: roles,
        actualRole: user.role,
        home: getHomeByRole(user.role),
      });
    }
    return <Navigate to={getHomeByRole(user.role)} replace />;
  }

  return element;
}
