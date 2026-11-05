import type { Metadata } from "next";
import { ProviderDashboardPage } from "@/components/provider-area/provider-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function ProviderPage() {
  return <ProviderDashboardPage />;
}
