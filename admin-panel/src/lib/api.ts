import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// API response types
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

// Create axios instance
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const api: AxiosInstance = axios.create({
  baseURL: API_URL + '/api/v1',
  headers: {
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  // Auth tokens live in httpOnly cookies set by the backend — the browser
  // attaches them automatically on every request as long as credentials
  // are included. There is nothing for client JS to read or attach.
  withCredentials: true,
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor: no token handling needed — the language header is
// the only thing left to attach.
api.interceptors.request.use(
  (config) => {
    if (config.headers) {
      config.headers['Accept-Language'] = 'en';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return data directly for easier access
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // /auth/me is a "do I have a session?" probe (used by checkAuth on
    // every page, including the login page itself for a logged-out guest).
    // Its 401 is an expected, routine answer — not a sign of an expired
    // session — so it must never trigger the refresh-then-redirect flow
    // below. Doing so previously caused an infinite reload loop: a guest
    // on /login -> /auth/me 401s -> refresh also 401s (no session at all)
    // -> hard redirect to /login -> remounts -> /auth/me fires again.
    const isAuthProbe = originalRequest.url?.includes('/auth/me');

    // Handle 401 Unauthorized. The refresh token is an httpOnly cookie sent
    // automatically — a 401 just means "ask the backend to refresh, using
    // whatever session cookie the browser still has."
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthProbe) {
      if (!isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true },
          );

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
        // Queue request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }
    }

    // Don't show toast for 401 as we handle it above
    if (error.response?.status !== 401) {
      // Only show toast for client errors, not for validation errors (let component handle)
      if (error.response?.status && error.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    }

    // Throw error for component handling
    return Promise.reject(error);
  }
);

// Helper methods for common request types
export const apiClient = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return api.get(url, config);
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return api.post(url, data, config);
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return api.put(url, data, config);
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return api.patch(url, data, config);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return api.delete(url, config);
  },

  upload: <T = unknown>(url: string, file: File, fieldName: string = 'file'): Promise<ApiResponse<T>> => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return api.post(url, formData);
  },

  uploadMultiple: <T = unknown>(url: string, files: File[], fieldName: string = 'files'): Promise<ApiResponse<T>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(fieldName, file);
    });
    return api.post(url, formData);
  },
};

export default api;
