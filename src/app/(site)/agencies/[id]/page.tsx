import type { Metadata } from "next";
import { WebsiteAgency } from "@/components/site/agency/website-agency";
export const metadata: Metadata = { title: "Local driver" };
export default async function AgencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebsiteAgency id={id} />;
}
