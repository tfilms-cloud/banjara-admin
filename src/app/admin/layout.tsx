import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · BANJARA Admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin panel signs in with its own session (separate from travellers and
 * providers), so only /admin pages are wrapped in the admin auth provider.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
