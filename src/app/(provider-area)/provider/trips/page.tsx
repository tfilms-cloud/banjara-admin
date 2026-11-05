import type { Metadata } from "next";
import { ProviderSection } from "@/components/provider-area/provider-section";

export const metadata: Metadata = { title: "My trips" };

export default function TripsPage() {
  return <ProviderSection section="trips" />;
}
