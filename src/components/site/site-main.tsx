import type { ReactNode } from "react";

/** Matches the shared fixed SiteHeader on every customer website route. */
export function SiteMain({ children }: { children: ReactNode }) {
  return <main className="flex-1 pt-[76px]">{children}</main>;
}
