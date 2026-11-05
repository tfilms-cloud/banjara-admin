import type { Metadata } from "next";
import { ProviderApplication } from "@/components/auth/provider-application";

export const metadata: Metadata = { title: "Your provider application" };

export default async function ProviderApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  // `?edit=details` comes from the review page's Edit link. Read here, on the server:
  // during client-side navigation window.location may still show the previous URL.
  const { edit } = await searchParams;
  return <ProviderApplication editing={edit === "details"} />;
}
