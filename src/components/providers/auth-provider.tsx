"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredAccessToken } from "@/lib/api";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  setSessionUser,
  subscribeSession,
} from "@/lib/session-store";
import { fetchMe, loginAdmin, logoutAdmin } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // The session lives in localStorage, so it is read through an external store
  // to keep server rendering and client hydration in sync.
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const authenticated = await loginAdmin(email, password);
      queryClient.clear();
      setSessionUser(authenticated);
      return authenticated;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await logoutAdmin();
    queryClient.clear();
    setSessionUser(null);
    router.replace("/admin/login");
  }, [queryClient, router]);

  const refresh = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setSessionUser(null);
      return null;
    }
    try {
      const fresh = await fetchMe();
      setSessionUser(fresh);
      return fresh;
    } catch {
      setSessionUser(null);
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      loading: !session.hydrated,
      isAuthenticated: Boolean(session.user),
      login,
      logout,
      refresh,
    }),
    [session, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
