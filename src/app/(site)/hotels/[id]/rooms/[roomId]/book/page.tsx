import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebsiteRoomBooking } from "@/components/site/hotels/website-room-booking";
import { pakistanDate } from "@/lib/home-discovery";
import { readHotelStay } from "@/lib/hotel-details";
import { getHotelById, getHotelRoomById } from "@/services/customer/hotel.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reserve your room" };

type Props = {
  params: Promise<{ id: string; roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomBookingPage({ params, searchParams }: Props) {
  const { id, roomId } = await params;
  const [hotel, room] = await Promise.all([getHotelById(id), getHotelRoomById(roomId)]);
  if (!hotel || !room || room.hotelId !== hotel.id) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value !== undefined) query.set(key, Array.isArray(value) ? value[0] : value);
  }
  const stay = readHotelStay(query, pakistanDate());
  return <WebsiteRoomBooking hotel={hotel} room={room} stay={stay} />;
}
