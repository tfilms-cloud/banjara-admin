import { customerGet, customerPut } from "@/lib/customer-api";
import { mapHotelRoom, type AnyRecord } from "@/lib/customer-mappers";
import { asArray } from "@/lib/utils";
import { bookingId, mapItineraryBooking } from "@/lib/booking-itineraries";
import { getHotelById } from "./hotel.service";
import { getTripById } from "./trip.service";
import type {
  BookingPass,
  BookingPayment,
  ItineraryBooking,
} from "@/types/customer/itinerary-booking";
type BookingPage = { items: AnyRecord[]; pagination: { totalPages: number } };
const record = (value: unknown): AnyRecord =>
  value && typeof value === "object" ? (value as AnyRecord) : {};

async function mapBatches<T, R>(
  values: T[],
  mapper: (value: T) => Promise<R>,
  concurrency = 6,
) {
  const results: R[] = [];
  for (let start = 0; start < values.length; start += concurrency)
    results.push(
      ...(await Promise.all(
        values.slice(start, start + concurrency).map(mapper),
      )),
    );
  return results;
}
/** Read every API page; counts never silently stop at the default 20 bookings. */
export async function getBookingItineraries(): Promise<ItineraryBooking[]> {
  const first = await customerGet<BookingPage>("/bookings/my-bookings", {
    params: { page: 1, limit: 100 },
  });
  const rows = asArray<AnyRecord>(first);
  const remaining = Array.from(
    { length: Math.max(0, (first.pagination?.totalPages ?? 1) - 1) },
    (_, i) => i + 2,
  );
  const pages = await mapBatches(remaining, (page) =>
    customerGet<BookingPage>("/bookings/my-bookings", {
      params: { page, limit: 100 },
    }),
  );
  pages.forEach((page) => rows.push(...asArray<AnyRecord>(page)));
  const cache = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, load: () => Promise<T>): Promise<T | null> => {
    if (!cache.has(key))
      cache.set(
        key,
        load().catch(() => null),
      );
    return cache.get(key) as Promise<T | null>;
  };
  const results = await mapBatches(rows, async (raw) => {
    const transport = record(raw.transportBooking),
      hotel = record(raw.hotelBooking),
      tour = record(raw.packageBooking);
    const providerId = bookingId(raw.providerId),
      tripId = bookingId(transport.tripId),
      hotelId = bookingId(hotel.hotelId),
      roomId = bookingId(hotel.roomId),
      itineraryId = bookingId(tour.itineraryId);
    const [provider, trip, property, room, itinerary] = await Promise.all([
      providerId
        ? once(`provider:${providerId}`, () =>
            customerGet<AnyRecord>(`/providers/public/${providerId}`),
          )
        : null,
      tripId ? once(`trip:${tripId}`, () => getTripById(tripId)) : null,
      hotelId ? once(`hotel:${hotelId}`, () => getHotelById(hotelId)) : null,
      roomId
        ? once(`room:${roomId}`, async () =>
            mapHotelRoom(await customerGet<AnyRecord>(`/rooms/${roomId}`)),
          )
        : null,
      itineraryId
        ? once(`itinerary:${itineraryId}`, () =>
            customerGet<AnyRecord>(`/tour-itineraries/${itineraryId}`),
          )
        : null,
    ]);
    return mapItineraryBooking(raw, {
      provider,
      trip,
      hotel: property,
      room,
      itinerary,
    });
  });
  return results.filter((booking): booking is ItineraryBooking => !!booking);
}
export async function getItineraryPass(id: string): Promise<BookingPass> {
  return customerGet<BookingPass>(`/bookings/${id}/ticket`);
}
export async function getItineraryPayment(id: string): Promise<BookingPayment> {
  return customerGet<BookingPayment>(`/payments/${id}`);
}
export async function cancelItinerary(id: string): Promise<void> {
  await customerPut(`/bookings/${id}/cancel`);
}
