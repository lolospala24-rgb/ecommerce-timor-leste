import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
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
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const getAccessToken = () => {
  let token = Cookies.get('access_token');
  if (!token && typeof window !== 'undefined') {
    token = window.localStorage.getItem('access_token') ?? undefined;
  }
  return token;
};

const getRefreshToken = () => {
  let refreshToken = Cookies.get('refresh_token');
  if (!refreshToken && typeof window !== 'undefined') {
    refreshToken = window.localStorage.getItem('refresh_token') ?? undefined;
  }
  return refreshToken;
};

const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('access_token', accessToken);
    window.localStorage.setItem('refresh_token', refreshToken);
  }
  Cookies.set('access_token', accessToken);
  Cookies.set('refresh_token', refreshToken);
};

const clearTokens = () => {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('refresh_token');
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language header if needed
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
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      
      if (refreshToken && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;
        
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { refreshToken }
          );
          
          const { access_token, refresh_token } = response.data;
          setTokens(access_token, refresh_token);
          
          // Update authorization header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          
          // Process queued requests
          processQueue(null, access_token);
          
          // Retry original request
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          clearTokens();
          
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
            toast.error('Your session has expired. Please login again.');
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else if (refreshToken && isRefreshing) {
        // Queue request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      } else {
        // No refresh token, redirect to login
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          toast.error('Please login to continue');
        }
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