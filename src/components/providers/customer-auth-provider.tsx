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
  getCustomerServerSessionSnapshot,
  getCustomerSessionSnapshot,
  reloadCustomerSession,
  setCustomerSessionUser,
  subscribeCustomerSession,
} from "@/lib/customer-session-store";
import {
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  type RegisterPayload,
} from "@/services/customer/auth.service";
import type { AuthUser } from "@/types/auth";

export type CustomerAuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const session = useSyncExternalStore(
    subscribeCustomerSession,
    getCustomerSessionSnapshot,
    getCustomerServerSessionSnapshot
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const authenticated = await loginCustomer(email, password);
      queryClient.clear();
      setCustomerSessionUser(authenticated);
      return authenticated;
    },
    [queryClient]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const authenticated = await registerCustomer(payload);
      queryClient.clear();
      setCustomerSessionUser(authenticated);
      return authenticated;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await logoutCustomer();
    queryClient.clear();
    setCustomerSessionUser(null);
    router.replace("/");
  }, [queryClient, router]);

  const refresh = useCallback(() => reloadCustomerSession(), []);

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      user: session.user,
      loading: !session.hydrated,
      isAuthenticated: Boolean(session.user),
      login,
      register,
      logout,
      refresh,
    }),
    [session, login, register, logout, refresh]
  );

  return (
    <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>.");
  }
  return context;
}
