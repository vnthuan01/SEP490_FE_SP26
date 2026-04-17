// AuthContextType.ts
import {
  type User,
  type LoginPayload,
  type PhoneLoginPayload,
  type LoginResponseData,
} from '@/services/authService';
import type { AxiosResponse } from 'axios';
import { createContext } from 'react';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<AxiosResponse<LoginResponseData>>;
  phoneLogin: (data: PhoneLoginPayload) => Promise<AxiosResponse<LoginResponseData>>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => Promise.resolve({} as AxiosResponse<LoginResponseData>),
  phoneLogin: () => Promise.resolve({} as AxiosResponse<LoginResponseData>),
  logout: async () => {},
});
