import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiSuccess, AuthTokens } from "@/types/auth";
import { backendAvailability, requireBackendConnection } from '@/lib/backend-availability';
import { isBackendOutage } from '@/lib/backend-monitor';
import { createTokenSession, scopeHeaders } from "@/lib/token-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** Traveller/provider site session: access token in memory, refresh token in an httpOnly cookie. */
export const siteSession = createTokenSession("site");

export class CustomerApiError extends Error {
  status?: number;
  errors?: unknown[];

  constructor(message: string, status?: number, errors?: unknown[]) {
    super(message);
    this.name = "CustomerApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getCustomerAccessToken() {
  return siteSession.getAccessToken();
}

export function persistCustomerSession(tokens: AuthTokens) {
  siteSession.setAccessToken(tokens.accessToken);
}

export function clearCustomerSession() {
  siteSession.clear();
}

export const customerApi = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  // Lets the API set and read the refresh cookie (it is path-scoped to /api/auth).
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...scopeHeaders("site"),
  },
});

customerApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getCustomerAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function refreshCustomerAccessToken() {
  const result = await siteSession.refresh();
  return result.kind === "ok" ? result.accessToken : null;
}

function normalizeError(error: unknown): CustomerApiError {
  if (error instanceof CustomerApiError) return error;
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string; errors?: unknown[] }>;
    if (!ax.response) {
      return new CustomerApiError("Unable to connect to server. Please check your connection.");
    }
    const status = ax.response.status;
    const message =
      ax.response.data?.message ||
      (status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : "Request failed. Please try again.");
    return new CustomerApiError(message, status, ax.response.data?.errors);
  }
  if (error instanceof Error) return new CustomerApiError(error.message);
  return new CustomerApiError("Something went wrong.");
}

customerApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (typeof window !== 'undefined' && isBackendOutage(error)) backendAvailability.reportFailure();
    const status = error.response?.status;
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    // A 401 from sign-in itself means wrong credentials, not an expired session.
    const isAuthCall = /^\/?auth\/(login|logout|register|forgot-password|reset-password)/.test(
      String(original?.url ?? ""),
    );
    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const accessToken = await refreshCustomerAccessToken();
      if (accessToken) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        };
        return customerApi.request(original);
      }
      if (
        typeof window !== "undefined" &&
        !/^\/(login|register|forgot-password)(\/|$)/.test(window.location.pathname)
      ) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?next=${next}`);
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

export async function customerRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    await requireBackendConnection();
    const epoch = backendAvailability.getEpoch();
    const response = await customerApi.request<ApiSuccess<T>>(config);
    if ((config.method ?? 'GET').toUpperCase() === 'GET' && epoch !== backendAvailability.getEpoch()) throw new Error('Connection changed. Please refresh this data.');
    return response.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export const customerGet = <T>(url: string, config?: AxiosRequestConfig) =>
  customerRequest<T>({ ...config, method: "GET", url });

export const customerPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  customerRequest<T>({ ...config, method: "POST", url, data });

export const customerPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  customerRequest<T>({ ...config, method: "PUT", url, data });

export const customerDel = <T>(url: string, config?: AxiosRequestConfig) =>
  customerRequest<T>({ ...config, method: "DELETE", url });
