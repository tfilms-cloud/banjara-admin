import type { AuthUser } from "@/types/auth";

/**
 * Pages a traveller may be sent back to after signing in. Anything else (other
 * origins, protocol-relative URLs, auth pages) falls back to the account page,
 * so `?next=` cannot be used as an open redirect.
 */
const SAFE_NEXT =
  /^\/(?:$|\?|account(?:\/|\?|$)|bookings(?:\/|\?|$)|messages(?:\/|\?|$)|explore(?:\?|$)|intercity(?:\/|\?|$)|trips\/[^/]+(?:\/book)?(?:\?|#|$)|hotels\/|tours\/|restaurants\/|guides\/|agencies\/)/;

export function safeNext(next: string | null | undefined): string | null {
  if (!next || next.startsWith("//")) return null;
  return SAFE_NEXT.test(next) ? next : null;
}

/**
 * Where a signed-in person lands. A provider who has not started an
 * application yet goes to choose their service; others see its status.
 */
export function homeAfterAuth(user: AuthUser, next?: string | null): string {
  if (user.role === "provider") return user.providerId ? "/provider" : "/provider-application";
  return safeNext(next) ?? "/account";
}

/** Builds an auth page link that keeps the page to return to. */
export function authHref(path: string, next?: string | null): string {
  const target = safeNext(next);
  return target ? `${path}?next=${encodeURIComponent(target)}` : path;
}
