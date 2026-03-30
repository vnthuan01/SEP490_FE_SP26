import { type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { type LoginPayload } from '@/services/authService';
import { AuthContext } from './AuthContextType';

type AuthProviderProps = { children: ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { user, isLoading, login: loginMutate, logout: logoutMutate } = useAuth();

  const login = (data: LoginPayload) => loginMutate(data);

  const logout = () => {
    logoutMutate();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
