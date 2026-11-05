import type { Metadata } from "next";
import { BookingDetail } from "@/components/provider-area/bookings/booking-detail";

export const metadata: Metadata = { title: "Booking details" };

type Props = { params: Promise<{ id: string }> };

export default async function ProviderBookingDetailPage({ params }: Props) {
  const { id } = await params;
  return <BookingDetail id={id} />;
}
