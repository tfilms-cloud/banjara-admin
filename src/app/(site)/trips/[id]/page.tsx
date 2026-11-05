import type { Metadata } from "next";
import { WebsiteTripDetails } from "@/components/site/trips/website-trip-details";
export const metadata: Metadata = { title: "Trip details" };
export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebsiteTripDetails id={id} />;
}
