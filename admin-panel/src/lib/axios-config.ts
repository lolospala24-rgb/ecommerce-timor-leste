import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// Configuration interfaces
interface AxiosConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

// Default configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const defaultConfig: AxiosConfig = {
  baseURL: API_URL + '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    return (
      !error.response ||
      error.response.status === 408 ||
      error.response.status === 429 ||
      (error.response.status >= 500 && error.response.status !== 501)
    );
  },
};

// Create axios instance
export const createAxiosInstance = (config?: Partial<AxiosConfig>): AxiosInstance => {
  const instance = axios.create({
    ...defaultConfig,
    ...config,
  });
  
  return instance;
};

// Setup request interceptors
export const setupRequestInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = Cookies.get('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add timestamp to prevent caching for GET requests
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
      }
      
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );
};

// Setup response interceptors with retry logic
export const setupResponseInterceptors = (
  instance: AxiosInstance,
  retryConfig: RetryConfig = defaultRetryConfig
): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & { _retryCount?: number };
      
      if (!config || !retryConfig.retryCondition(error)) {
        return Promise.reject(error);
      }
      
      const retryCount = config._retryCount ?? 0;
      
      if (retryCount >= retryConfig.maxRetries) {
        return Promise.reject(error);
      }
      
      config._retryCount = retryCount + 1;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * config._retryCount));
      
      return instance(config);
    }
  );
};

// Setup auth response interceptors
export const setupAuthInterceptors = (instance: AxiosInstance): void => {
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
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
  
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = Cookies.get('refresh_token');
        
        if (refreshToken && !isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;
          
          try {
            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
              { refreshToken }
            );
            
            const { access_token, refresh_token } = response.data;
            Cookies.set('access_token', access_token);
            Cookies.set('refresh_token', refresh_token);
            
            processQueue(null, access_token);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            
            return instance(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError as Error, null);
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
            
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else if (refreshToken && isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        } else {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Create fully configured axios instance
export const createApiClient = (): AxiosInstance => {
  const instance = createAxiosInstance();
  setupRequestInterceptors(instance);
  setupResponseInterceptors(instance);
  setupAuthInterceptors(instance);
  return instance;
};

// Export configured instance
export const axiosClient = createApiClient();