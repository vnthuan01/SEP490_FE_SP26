import axios, { type AxiosRequestHeaders, type InternalAxiosRequestConfig } from 'axios';
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from './cookies';
import { notifyTokenUpdate } from './tokenBridge';

const BASE_URL = import.meta.env.VITE_BASE_API_URI || import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag để tránh loop vô hạn
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Request interceptor: tự động gắn access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    const headers = (config.headers || {}) as AxiosRequestHeaders;
    headers['Authorization'] = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

// Response interceptor: check 401 → refresh token
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Bỏ qua interceptor nếu là request login hoặc refresh token để tránh loop
    const isAuthRequest =
      originalRequest.url?.includes('/login') || originalRequest.url?.includes('/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        // Nếu đang refresh, queue lại request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (!originalRequest.headers) originalRequest.headers = {};
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        // Gọi server lấy access token mới
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          { refreshToken }, // gửi refresh token trong body
          { headers: { 'Content-Type': 'application/json' } },
        );

        const refreshPayload = data?.data ?? data;
        const newAccessToken: string | undefined = refreshPayload?.accessToken;
        const newRefreshToken: string | undefined = refreshPayload?.refreshToken;

        if (!newAccessToken) {
          throw new Error('Refresh token response does not contain accessToken');
        }

        setAuthToken(newAccessToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        // Thông báo cho AuthContext cập nhật React state
        notifyTokenUpdate(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);

        if (!originalRequest.headers) {
          originalRequest.headers = {} as AxiosRequestHeaders;
        }
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        clearAuthToken();
        notifyTokenUpdate(null, null);
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
