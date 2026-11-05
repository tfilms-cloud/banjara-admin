import { customerGet, customerPost } from "@/lib/customer-api";
import { mapHotel, mapHotelRoom, type AnyRecord } from "@/lib/customer-mappers";
import { serverGet } from "@/lib/server-api";
import { asArray, idOf } from "@/lib/utils";
import type {
  Hotel,
  HotelRoom,
  HotelSearchParams,
  HotelStay,
  HotelQuote,
  HotelQuoteInput,
  HotelReview,
} from "@/types/customer/hotel";

export async function searchHotels(
  params: HotelSearchParams,
): Promise<Hotel[]> {
  const query = params.query?.trim();
  const searchParams = {
    destination: query ? undefined : params.destination || undefined,
    checkIn: params.checkIn || undefined,
    checkOut: params.checkOut || undefined,
    guests: params.adults + params.children,
    rooms: params.rooms,
    sort: "recommended",
  };

  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>("/hotels/search", searchParams)
      : await customerGet<unknown>("/hotels/search", { params: searchParams });

  return asArray<AnyRecord>(data).map(mapHotel);
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  if (!id) return null;
  try {
    const data =
      typeof window === "undefined"
        ? await serverGet<AnyRecord>(`/hotels/${id}`)
        : await customerGet<AnyRecord>(`/hotels/${id}`);
    return mapHotel(data);
  } catch {
    return null;
  }
}

export async function getHotelRooms(
  hotelId: string,
  stay?: HotelStay,
): Promise<HotelRoom[]> {
  if (!hotelId) return [];
  const params = stay
    ? {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guests: stay.adults + stay.children,
        rooms: stay.rooms,
      }
    : undefined;
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>(`/rooms/hotel/${hotelId}`, params)
      : await customerGet<unknown>(`/rooms/hotel/${hotelId}`, { params });
  return asArray<AnyRecord>(data).map(mapHotelRoom);
}

export async function getHotelRoomById(id: string): Promise<HotelRoom | null> {
  if (!id) return null;
  try {
    const data =
      typeof window === "undefined"
        ? await serverGet<AnyRecord>(`/rooms/${id}`)
        : await customerGet<AnyRecord>(`/rooms/${id}`);
    return mapHotelRoom(data);
  } catch {
    return null;
  }
}

/** Availability/price check only: this endpoint does not reserve inventory or charge. */
export async function getHotelQuote(
  input: HotelQuoteInput,
): Promise<HotelQuote> {
  return customerPost<HotelQuote>("/hotels/quote", input);
}
export async function getHotelReviews(
  providerId: string,
): Promise<HotelReview[]> {
  if (!providerId) return [];
  const path = `/reviews/provider/${providerId}`;
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>(path)
      : await customerGet<unknown>(path);
  return asArray<AnyRecord>(data)
    .filter((raw) => raw.serviceType === "hotel")
    .map((raw) => ({
      id: idOf(raw),
      rating: Number(raw.rating ?? 0),
      comment: String(raw.comment || raw.serviceComment || ""),
      createdAt: String(raw.createdAt ?? ""),
      providerReply: String(raw.providerReply ?? "") || undefined,
    }));
}

export async function getPopularHotels(limit = 8): Promise<Hotel[]> {
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>("/hotels/search", {
          sort: "recommended",
          limit,
        })
      : await customerGet<unknown>("/hotels/search", {
          params: { sort: "recommended", limit },
        });
  return asArray<AnyRecord>(data).map(mapHotel);
}
