"use client";

import { getStoredAccessToken, getStoredUser } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export type SessionState = {
  user: AuthUser | null;
  hydrated: boolean;
};

const SERVER_STATE: SessionState = { user: null, hydrated: false };

function readStoredSession(): SessionState {
  const token = getStoredAccessToken();
  const stored = token ? getStoredUser<AuthUser>() : null;
  return {
    user: stored && stored.role === "admin" ? stored : null,
    hydrated: true,
  };
}

let state: SessionState =
  typeof window === "undefined" ? SERVER_STATE : readStoredSession();

const listeners = new Set<() => void>();

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): SessionState {
  return state;
}

export function getServerSessionSnapshot(): SessionState {
  return SERVER_STATE;
}

export function setSessionUser(user: AuthUser | null) {
  state = { user, hydrated: true };
  listeners.forEach((listener) => listener());
}
