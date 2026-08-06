import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { getApiClient } from './axios-config';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: string[];
  code?: string;
  timestamp: string;
  path?: string;
}

// Determine API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : '/api/v1';

// Use shared axios instance from axios-config
const api = getApiClient();

export const isNetworkError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const code = error.code;
  const message = error.message || '';

  return !status || code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || message.includes('ERR_CONNECTION_REFUSED') || message.includes('Network Error') || message.includes('Failed to fetch');
};

// Response handling (keep app-specific behavior like refresh token and toasts)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // The shared instance may already return response.data in other layers
    // but keep a consistent contract: return response.data
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || error.message || 'Something went wrong';
    const url = error.config?.url || API_BASE_URL;

    if (isNetworkError(error)) {
      console.warn('[API Network Error]', {
        url,
        status: status ?? 'NO_RESPONSE',
        code: error.code,
        message,
      });
    } else {
      console.error('[API Response Error]', {
        url,
        status: status ?? 'NO_RESPONSE',
        code: error.code,
        message,
        responseData: data,
      });
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized - refresh token
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = Cookies.get('refresh_token');
      
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { refreshToken }
          );

          const { access_token, refresh_token } = response.data;
          Cookies.set('access_token', access_token);
          Cookies.set('refresh_token', refresh_token);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          console.error('[Refresh Token Error]', refreshError);
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }

    // Show error toast for non-401 errors
    if (status !== 401) {
      if (isNetworkError(error)) {
        toast.error('The server is currently unavailable. Please try again shortly.');
      } else if (status !== 400) {
        toast.error(message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;