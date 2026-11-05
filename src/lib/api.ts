import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiSuccess, AuthTokens } from "@/types/auth";
import { createTokenSession, scopeHeaders } from "@/lib/token-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** Admin portal session: access token in memory, refresh token in an httpOnly cookie. */
export const adminSession = createTokenSession("admin");

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

export function getAdminAccessToken() {
  return adminSession.getAccessToken();
}

export function persistSession(tokens: AuthTokens) {
  adminSession.setAccessToken(tokens.accessToken);
}

export function clearSession() {
  adminSession.clear();
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  // Lets the API set and read the refresh cookie (it is path-scoped to /api/auth).
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...scopeHeaders("admin"),
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = adminSession.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function refreshAccessToken() {
  const result = await adminSession.refresh();
  return result.kind === "ok" ? result.accessToken : null;
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
    // A 401 from sign-in/logout itself is not an expired session.
    const isAuthCall = /^\/?auth\/(login|logout|forgot-password|reset-password)/.test(String(original?.url ?? ""));
    if (status === 401 && original && !original._retry && !isAuthCall) {
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
