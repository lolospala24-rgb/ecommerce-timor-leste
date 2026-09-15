import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';

export interface ApiResponse<T = unknown> {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const api: AxiosInstance = axios.create({
  baseURL: API_URL + '/api/v1',
  headers: {
    Accept: 'application/json',
  },
  timeout: 30000,
  // Same shared-backend auth model as admin-panel/frontend-ecommerce: the
  // real JWT lives in an httpOnly cookie the browser attaches automatically.
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    if (config.headers) {
      config.headers['Accept-Language'] = 'en';
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthProbe = originalRequest.url?.includes('/auth/me');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthProbe) {
      if (!isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
          processQueue(null);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
            toast.error('Your session has expired. Please login again.');
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }
    }

    if (error.response?.status !== 401) {
      if (error.response?.status && error.response.status >= 500) {
        toast.error('Server error. Please try again later.', { id: 'api-server-error' });
      } else if (!error.response && !isAuthProbe) {
        toast.error('Could not reach the server. Check your connection and try again.', {
          id: 'api-network-error',
        });
      }
    }

    return Promise.reject(error);
  },
);

export const apiClient = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => api.get(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.post(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.put(url, data, config),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.patch(url, data, config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => api.delete(url, config),
};

export default api;
