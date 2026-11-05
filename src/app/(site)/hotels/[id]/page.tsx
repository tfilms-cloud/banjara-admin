import { notFound } from "next/navigation";
import {
  getHotelById,
  getHotelReviews,
  getHotelRooms,
} from "@/services/customer/hotel.service";
import { WebsiteHotelDetails } from "@/components/site/hotels/website-hotel-details";
import { readHotelStay } from "@/lib/hotel-details";
import { pakistanDate } from "@/lib/home-discovery";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const hotel = await getHotelById((await params).id);
  return {
    title: hotel?.name ?? "Property unavailable",
    description: hotel
      ? `${hotel.name} in ${hotel.location.city}. Browse rooms, amenities and current availability on BANJARA.`
      : undefined,
  };
}
export default async function HotelDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const hotel = await getHotelById(id);
  if (!hotel) notFound();
  const values = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined)
      qs.set(key, Array.isArray(value) ? value[0] : value);
  }
  const today = pakistanDate();
  const stay = readHotelStay(qs, today);
  const [rooms, reviews] = await Promise.allSettled([
    getHotelRooms(id, stay),
    getHotelReviews(hotel.providerId ?? ""),
  ]);
  return (
    <WebsiteHotelDetails
      key={hotel.id}
      hotel={hotel}
      initialStay={stay}
      initialRoomId={qs.get("roomId") ?? ""}
      today={today}
      initialRooms={rooms.status === "fulfilled" ? rooms.value : undefined}
      initialReviews={
        reviews.status === "fulfilled" ? reviews.value : undefined
      }
    />
  );
}
