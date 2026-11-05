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
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  reloadSession,
  setSessionUser,
  subscribeSession,
} from "@/lib/session-store";
import {
  completeAdminLogin,
  loginAdmin,
  logoutAdmin,
  logoutAdminEverywhere,
  type AdminLoginResult,
} from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Either signs in, or reports that a 2-step code is needed (see `verifyCode`). */
  login: (email: string, password: string) => Promise<AdminLoginResult>;
  verifyCode: (mfaToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // The session is restored on the client from an httpOnly cookie, so it is read
  // through an external store to keep server rendering and client hydration in sync.
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginAdmin(email, password);
      if (result.kind === "signed-in") {
        queryClient.clear();
        setSessionUser(result.user);
      }
      return result;
    },
    [queryClient]
  );

  const verifyCode = useCallback(
    async (mfaToken: string, code: string) => {
      const authenticated = await completeAdminLogin(mfaToken, code);
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

  const logoutEverywhere = useCallback(async () => {
    await logoutAdminEverywhere();
    queryClient.clear();
    setSessionUser(null);
    router.replace("/admin/login");
  }, [queryClient, router]);

  const refresh = useCallback(() => reloadSession(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      loading: !session.hydrated,
      isAuthenticated: Boolean(session.user),
      login,
      verifyCode,
      logout,
      logoutEverywhere,
      refresh,
    }),
    [session, login, verifyCode, logout, logoutEverywhere, refresh]
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
