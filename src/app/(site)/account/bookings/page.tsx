import type { Metadata } from "next";
import { Suspense } from "react";
import { WebsiteBookings } from "@/components/site/bookings/website-bookings";
export const metadata: Metadata = {
  title: "Bookings & Itineraries",
  description:
    "Manage your BANJARA transport, hotel, tour and guide bookings, tickets and vouchers.",
};
export default function AccountBookingsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12">Loading bookings…</div>}>
      <WebsiteBookings />
    </Suspense>
  );
}
