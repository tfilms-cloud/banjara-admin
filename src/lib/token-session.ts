import axios from "axios";

/**
 * One browser session (admin portal or traveller/provider site).
 *
 * - The refresh token lives only in an httpOnly cookie set by the API, scoped to
 *   /api/auth, so no script on this page can ever read it.
 * - The access token (15 min) lives only in this module's memory. A page load gets a
 *   fresh one from the cookie.
 * - `X-Session-Scope` tells the API to use the cookie; it is also what makes the
 *   cookie unusable from other sites (custom header = CORS preflight).
 */
export type SessionScope = "admin" | "site";

export type RefreshResult =
  | { kind: "ok"; accessToken: string; user: Record<string, unknown> }
  /** No valid session: the user is signed out. */
  | { kind: "signed-out" }
  /** API unreachable or erroring: the session may still be fine, try again later. */
  | { kind: "unreachable" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** localStorage keys used before sessions moved to cookies. */
const LEGACY_KEYS: Record<SessionScope, { access: string; refresh: string; user: string }> = {
  admin: { access: "bangara_admin_access", refresh: "bangara_admin_refresh", user: "bangara_admin_user" },
  site: { access: "banjara_customer_access", refresh: "banjara_customer_refresh", user: "banjara_customer_user" },
};

export function scopeHeaders(scope: SessionScope) {
  return { "X-Session-Scope": scope };
}

function readLegacyRefresh(scope: SessionScope): string | null {
  try {
    return localStorage.getItem(LEGACY_KEYS[scope].refresh);
  } catch {
    return null;
  }
}

function clearLegacy(scope: SessionScope) {
  try {
    const keys = LEGACY_KEYS[scope];
    localStorage.removeItem(keys.access);
    localStorage.removeItem(keys.refresh);
    localStorage.removeItem(keys.user);
  } catch {
    // storage blocked: nothing to clear
  }
}

/**
 * A non-secret "this browser has a session" flag. It is NOT a credential (the httpOnly
 * refresh cookie on the API is): anyone can set it, and the API still checks every
 * request. It only lets
 *  - anonymous visitors skip a refresh request on every page load, and
 *  - `src/proxy.ts` send signed-out visitors to the sign-in page before an admin or
 *    provider page is even rendered.
 * It is a cookie (not localStorage) so the Next server can see it.
 */
export function hintCookieName(scope: SessionScope) {
  return `banjara_${scope}_signed_in`;
}

const HINT_MAX_AGE = 7 * 24 * 3600; // the refresh token's lifetime

function hasHint(scope: SessionScope) {
  if (typeof document === "undefined") return false;
  const name = hintCookieName(scope);
  if (document.cookie.split("; ").some((c) => c === `${name}=1`)) return true;
  // Sessions from before the flag moved to a cookie kept it in localStorage.
  try {
    if (localStorage.getItem(name) === "1") {
      localStorage.removeItem(name);
      setHint(scope, true);
      return true;
    }
  } catch {
    // storage blocked
  }
  return false;
}

function setHint(scope: SessionScope, on: boolean) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = on
    ? `${hintCookieName(scope)}=1; Path=/; Max-Age=${HINT_MAX_AGE}; SameSite=Lax${secure}`
    : `${hintCookieName(scope)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** Runs `fn` while holding a cross-tab lock, so tabs never rotate the cookie at once. */
async function withTabLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request(name, fn) as Promise<T>;
}

export function createTokenSession(scope: SessionScope) {
  let accessToken: string | null = null;
  let inflight: Promise<RefreshResult> | null = null;

  async function callRefresh(): Promise<RefreshResult> {
    const legacy = readLegacyRefresh(scope);
    if (!legacy && !hasHint(scope)) {
      accessToken = null;
      return { kind: "signed-out" };
    }
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        // A tab from before the cookie switch hands its old token over once.
        legacy ? { refreshToken: legacy } : {},
        { withCredentials: true, timeout: 15000, headers: scopeHeaders(scope) },
      );
      const data = response.data?.data;
      const token = data?.tokens?.accessToken as string | undefined;
      if (legacy) clearLegacy(scope);
      if (!token || !data?.user) {
        setHint(scope, false);
        return { kind: "signed-out" };
      }
      accessToken = token;
      setHint(scope, true);
      return { kind: "ok", accessToken: token, user: data.user };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403 || status === 422) {
        if (legacy) clearLegacy(scope);
        accessToken = null;
        setHint(scope, false);
        return { kind: "signed-out" };
      }
      return { kind: "unreachable" };
    }
  }

  return {
    scope,
    getAccessToken: () => accessToken,
    setAccessToken(token: string) {
      accessToken = token;
      setHint(scope, true);
      clearLegacy(scope);
    },
    clear() {
      accessToken = null;
      setHint(scope, false);
      clearLegacy(scope);
    },
    /** Exchanges the cookie for a new access token. Concurrent calls share one request. */
    refresh(): Promise<RefreshResult> {
      if (!inflight) {
        inflight = withTabLock(`banjara-refresh-${scope}`, callRefresh).finally(() => {
          inflight = null;
        });
      }
      return inflight;
    },
  };
}

export type TokenSession = ReturnType<typeof createTokenSession>;
