import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebsiteRoomDetails } from "@/components/site/hotels/website-room-details";
import { pakistanDate } from "@/lib/home-discovery";
import { readHotelStay } from "@/lib/hotel-details";
import {
  getHotelById,
  getHotelRoomById,
  getHotelRooms,
} from "@/services/customer/hotel.service";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ id: string; roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, roomId } = await params;
  const room = await getHotelRoomById(roomId);
  return {
    title: room?.hotelId === id ? room.name : "Room unavailable",
    description:
      room?.hotelId === id
        ? `Explore ${room.name}, room amenities and stay availability on BANJARA.`
        : undefined,
  };
}

export default async function RoomDetailsPage({ params, searchParams }: Props) {
  const { id, roomId } = await params;
  const [hotel, room] = await Promise.all([
    getHotelById(id),
    getHotelRoomById(roomId),
  ]);
  if (!hotel || !room || room.hotelId !== hotel.id) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value !== undefined)
      query.set(key, Array.isArray(value) ? value[0] : value);
  }
  const today = pakistanDate();
  const stay = readHotelStay(query, today);
  const [availability, catalog] = await Promise.allSettled([
    getHotelRooms(id, stay),
    getHotelRooms(id),
  ]);
  return (
    <WebsiteRoomDetails
      key={room.id}
      hotel={hotel}
      room={room}
      initialStay={stay}
      today={today}
      initialAvailableRooms={
        availability.status === "fulfilled" ? availability.value : undefined
      }
      initialCatalog={
        catalog.status === "fulfilled" ? catalog.value : undefined
      }
    />
  );
}
