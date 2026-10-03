import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from './authStorage';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// Queue concurrent 401s behind a single refresh call instead of firing one refresh per request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: auth.refreshToken });
    setStoredAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken as string;
  } catch {
    clearStoredAuth();
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    return data?.error?.message ?? fallback;
  }
  return fallback;
}
