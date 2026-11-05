"use client";

import { adminSession } from "@/lib/api";
import { startSessionBootstrap } from "@/lib/session-bootstrap";
import { mapUser } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";

export type SessionState = {
  user: AuthUser | null;
  hydrated: boolean;
};

const SERVER_STATE: SessionState = { user: null, hydrated: false };

let state: SessionState = SERVER_STATE;

const listeners = new Set<() => void>();

function emit(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Nothing about the session is stored in the browser any more, so the user is
 * restored by exchanging the httpOnly refresh cookie for a fresh access token.
 */
const bootstrap = startSessionBootstrap(adminSession, (raw) => {
  const user = mapUser(raw);
  return user.role === "admin" ? user : null;
}, (user) => emit({ user, hydrated: true }));

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  bootstrap.ensureStarted();
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
  bootstrap.settle();
  emit({ user, hydrated: true });
}

/** Re-reads the session from the cookie (e.g. after another tab signed in/out). */
export function reloadSession() {
  return bootstrap.reload();
}
