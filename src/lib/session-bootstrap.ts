import type { TokenSession } from "@/lib/token-session";
import type { AuthUser } from "@/types/auth";

const RETRY_MS = [1000, 2000, 4000, 8000, 15000];

/**
 * Restores a session on page load from the refresh cookie.
 *
 * - signed in → `onResolved(user)`
 * - no session (or a user this area does not accept) → `onResolved(null)`
 * - API unreachable → stay "loading" and retry, so a brief outage never looks
 *   like a sign-out (the cookie is still there when the API comes back)
 */
export function startSessionBootstrap(
  session: TokenSession,
  accept: (raw: Record<string, unknown>) => AuthUser | null,
  onResolved: (user: AuthUser | null) => void,
) {
  let started = false;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function attempt(retry: number): Promise<AuthUser | null> {
    const result = await session.refresh();
    if (settled) return null;
    if (result.kind === "unreachable") {
      return new Promise((resolve) => {
        timer = setTimeout(
          () => resolve(attempt(retry + 1)),
          RETRY_MS[Math.min(retry, RETRY_MS.length - 1)],
        );
      });
    }
    const user = result.kind === "ok" ? accept(result.user) : null;
    if (!user) session.clear();
    settled = true;
    onResolved(user);
    return user;
  }

  return {
    ensureStarted() {
      if (started || typeof window === "undefined") return;
      started = true;
      void attempt(0);
    },
    /** A sign-in/out already decided the session; stop any pending restore. */
    settle() {
      started = true;
      settled = true;
      if (timer) clearTimeout(timer);
    },
    reload() {
      if (timer) clearTimeout(timer);
      started = true;
      settled = false;
      return attempt(0);
    },
  };
}
