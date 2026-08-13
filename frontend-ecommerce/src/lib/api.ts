import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
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
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // `/auth/me` is a silent background probe (checkAuth() runs on every page
    // load, including for anonymous visitors, to see if a session cookie is
    // still valid) — a 401 here just means "not logged in," which is the
    // normal, expected state for a guest. It's not an application error, so
    // it shouldn't be logged as one or trigger the redirect-to-login below.
    const isBackgroundAuthProbe = status === 401 && url.includes('/auth/me');

    if (isNetworkError(error)) {
      console.warn('[API Network Error]', {
        url,
        status: status ?? 'NO_RESPONSE',
        code: error.code,
        message,
      });
    } else if (!isBackgroundAuthProbe) {
      console.error('[API Response Error]', {
        url,
        status: status ?? 'NO_RESPONSE',
        code: error.code,
        message,
        responseData: data,
      });
    }

    // Handle 401 Unauthorized - refresh token. The refresh token lives in an
    // httpOnly cookie, so it's sent automatically (withCredentials) rather
    // than read from JS — a 401 here just means "try the refresh endpoint
    // and see if the browser still has a valid session cookie."
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );

        return api(originalRequest);
      } catch (refreshError) {
        // A failed refresh after a background auth probe just confirms the
        // visitor is logged out — expected, not worth logging as an error.
        // Force-redirecting here would also bounce every guest off public
        // pages like the storefront or category listings on load.
        if (!isBackgroundAuthProbe) {
          console.error('[Refresh Token Error]', refreshError);
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Show error toast for non-401 errors
    if (status !== 401) {
      if (isNetworkError(error)) {
        toast.error('The server is currently unavailable. Please try again shortly.');
      } else {
        toast.error(message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;