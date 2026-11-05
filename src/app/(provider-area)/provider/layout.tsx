import type { Metadata } from "next";
import { ProviderShell } from "@/components/provider-area/provider-shell";

export const metadata: Metadata = {
  title: { default: "Provider", template: "%s · BANJARA Provider" },
};

/** The provider area has its own layout (sidebar), not the traveller site's header. */
export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <ProviderShell>{children}</ProviderShell>;
}
