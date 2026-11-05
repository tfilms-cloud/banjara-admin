import type { Metadata } from "next";
import { WebsiteTripBooking } from "@/components/site/trips/website-trip-booking";

export const metadata: Metadata = { title: "Book your ride" };

export default async function TripBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ passengers?: string; pickupPoint?: string }>;
}) {
  const { id } = await params;
  const { passengers, pickupPoint } = await searchParams;
  return (
    <WebsiteTripBooking
      id={id}
      initialPassengers={Number(passengers) || 1}
      initialPickupId={pickupPoint ?? ""}
    />
  );
}
