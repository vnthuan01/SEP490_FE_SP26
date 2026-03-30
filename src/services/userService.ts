import { apiClient } from '@/lib/apiClients';

export interface UserResponse<T> {
  displayName: string;
  email: string;
  phoneNumber: string;
  role: [string];
  data: T;
}

// Current logged-in user profile (no userId required)
export const getCurrentUserProfile = async () => {
  const res = await apiClient.get('/Auth/me');
  return res.data;
};

// Backward-compatible alias
export const getMyProfile = getCurrentUserProfile;
