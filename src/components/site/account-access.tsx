"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authHref } from "@/lib/auth-redirect";

/**
 * Older links open `?auth=signin|register` on any page. Sign-in and sign-up now
 * have their own pages, so forward those links there and keep the return page.
 */
export function AccountAccess() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("auth");
  const next = params.get("next");
  useEffect(() => {
    if (mode === "signin") router.replace(authHref("/login", next));
    else if (mode === "register") router.replace(authHref("/register", next));
  }, [mode, next, router]);
  return null;
}
