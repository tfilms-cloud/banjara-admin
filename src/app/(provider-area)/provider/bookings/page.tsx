import type { Metadata } from "next";
import { BookingsPage } from "@/components/provider-area/bookings/bookings-page";

export const metadata: Metadata = { title: "Bookings" };

export default function ProviderBookingsPage() {
  return <BookingsPage />;
}
