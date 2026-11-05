import { WebsiteTourBooking } from "@/components/site/tours/website-tour-booking";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reserve a tour" };
export default async function TourBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (value !== undefined)
      query.set(key, Array.isArray(value) ? value[0] : value);
  return (
    <WebsiteTourBooking
      id={(await params).id}
      initialQuery={query.toString()}
    />
  );
}
