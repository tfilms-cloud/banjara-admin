"use client";

import { siteSession } from "@/lib/customer-api";
import { mapCustomerUser, type AnyRecord } from "@/lib/customer-mappers";
import { startSessionBootstrap } from "@/lib/session-bootstrap";
import type { AuthUser } from "@/types/auth";

export type CustomerSessionState = {
  user: AuthUser | null;
  hydrated: boolean;
};

const SERVER_STATE: CustomerSessionState = { user: null, hydrated: false };

let state: CustomerSessionState = SERVER_STATE;

const listeners = new Set<() => void>();

function emit(next: CustomerSessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Restores the traveller/provider session from the httpOnly refresh cookie. */
const bootstrap = startSessionBootstrap(siteSession, (raw) => {
  const user = mapCustomerUser(raw as AnyRecord);
  return user.role === "admin" ? null : user;
}, (user) => emit({ user, hydrated: true }));

export function subscribeCustomerSession(listener: () => void) {
  listeners.add(listener);
  bootstrap.ensureStarted();
  return () => {
    listeners.delete(listener);
  };
}

export function getCustomerSessionSnapshot(): CustomerSessionState {
  return state;
}

export function getCustomerServerSessionSnapshot(): CustomerSessionState {
  return SERVER_STATE;
}

export function setCustomerSessionUser(user: AuthUser | null) {
  bootstrap.settle();
  emit({ user, hydrated: true });
}

/** Re-reads the session from the cookie. */
export function reloadCustomerSession() {
  return bootstrap.reload();
}
