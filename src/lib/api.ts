import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiSuccess, AuthTokens } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const ACCESS_KEY = "bangara_admin_access";
const REFRESH_KEY = "bangara_admin_refresh";
const USER_KEY = "bangara_admin_user";

export class ApiError extends Error {
  status?: number;
  errors?: unknown[];

  constructor(message: string, status?: number, errors?: unknown[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser<T>() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function persistSession(user: unknown, tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const data = response.data?.data;
      const accessToken = data?.tokens?.accessToken as string | undefined;
      const nextRefresh = data?.tokens?.refreshToken as string | undefined;
      const user = data?.user;
      if (!accessToken || !nextRefresh) return null;
      persistSession(user ?? getStoredUser(), { accessToken, refreshToken: nextRefresh });
      return accessToken;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string; errors?: unknown[] }>;
    if (!ax.response) {
      return new ApiError("Unable to connect to server. Please check your connection.");
    }
    const status = ax.response.status;
    const message =
      ax.response.data?.message ||
      (status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : "Request failed. Please try again.");
    return new ApiError(message, status, ax.response.data?.errors);
  }
  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError("Something went wrong.");
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        };
        return api.request(original);
      }
      if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<ApiSuccess<T>>(config);
    return response.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  apiRequest<T>({ ...config, method: "GET", url });

export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiRequest<T>({ ...config, method: "POST", url, data });

export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiRequest<T>({ ...config, method: "PUT", url, data });

export const del = <T>(url: string, config?: AxiosRequestConfig) =>
  apiRequest<T>({ ...config, method: "DELETE", url });
