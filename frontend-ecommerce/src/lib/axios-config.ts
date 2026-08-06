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
const defaultConfig: AxiosConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
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
  return axios.create({
    ...defaultConfig,
    ...config,
  });
};

// Setup request interceptors
export const setupRequestInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = Cookies.get('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );
};

// Setup response interceptors with retry logic
export const setupResponseInterceptors = (
  instance: AxiosInstance,
  retryConfig: RetryConfig = defaultRetryConfig
): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & { _retryCount?: number };
      
      if (!config || !retryConfig.retryCondition(error)) {
        return Promise.reject(error);
      }
      
      config._retryCount = config._retryCount || 0;
      
      if (config._retryCount >= retryConfig.maxRetries) {
        return Promise.reject(error);
      }
      
      config._retryCount += 1;
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * config._retryCount));
      return instance(config);
    }
  );
};

// Create fully configured axios instance
export const createApiClient = (): AxiosInstance => {
  const instance = createAxiosInstance();
  setupRequestInterceptors(instance);
  setupResponseInterceptors(instance);
  return instance;
};

// Lazy singleton getter to avoid duplicate instances across imports
let apiClient: AxiosInstance | null = null;
export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    apiClient = createApiClient();
  }
  return apiClient;
};