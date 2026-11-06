import { customerGet, customerPost, customerPut } from "@/lib/customer-api";
import {
  mapCustomerBooking,
  toBackendPaymentMethod,
  type AnyRecord,
} from "@/lib/customer-mappers";
import { asArray } from "@/lib/utils";
import type {
  CreateTransportBookingPayload,
  CustomerBooking,
  TransportBooking,
} from "@/types/customer/booking";

export async function createTransportBooking(
  payload: CreateTransportBookingPayload,
): Promise<TransportBooking> {
  const data = await customerPost<AnyRecord>("/bookings", {
    bookingType: "transport",
    paymentMethod: toBackendPaymentMethod(payload.paymentMethod),
    transportBooking: {
      tripId: payload.tripId,
      seats: payload.seats,
      pickupPoint: payload.pickupPointId,
      passengerDetails: payload.passengers ?? [
        {
          name: payload.passengerDetails.name,
          phone: payload.passengerDetails.phone,
        },
      ],
    },
  });
  return mapCustomerBooking(data) as TransportBooking;
}

export async function getMyBookings(): Promise<CustomerBooking[]> {
  const data = await customerGet<unknown>("/bookings/my-bookings");
  return asArray<AnyRecord>(data).map(mapCustomerBooking);
}

export async function getBookingById(
  id: string,
): Promise<CustomerBooking | null> {
  try {
    const data = await customerGet<AnyRecord>(`/bookings/${id}`);
    return mapCustomerBooking(data);
  } catch {
    return null;
  }
}

export async function cancelBooking(id: string): Promise<CustomerBooking> {
  const data = await customerPut<AnyRecord>(`/bookings/${id}/cancel`);
  return mapCustomerBooking(data);
}

export async function getTicket(id: string) {
  return customerGet<AnyRecord>(`/bookings/${id}/ticket`);
}

export type HotelBookingResult = {
  id: string;
  bookingNumber: string;
  status: string;
  totalAmount: number;
  nights: number;
};

/**
 * Requests a room. Paid at the property for now; online wallets (EasyPaisa,
 * JazzCash) come with BANJARA's merchant accounts.
 */
export async function createHotelBooking(input: {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  guest: { name: string; email: string; phone: string; specialRequests?: string };
}): Promise<HotelBookingResult> {
  const data = await customerPost<AnyRecord>("/bookings", {
    bookingType: "hotel",
    paymentMethod: "payAtHotel",
    hotelBooking: {
      hotelId: input.hotelId,
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rooms: input.rooms,
      guests: input.guests,
      guestDetails: {
        name: input.guest.name.trim(),
        email: input.guest.email.trim().toLowerCase(),
        phone: input.guest.phone.trim(),
        ...(input.guest.specialRequests?.trim() ? { specialRequests: input.guest.specialRequests.trim() } : {}),
      },
    },
  });
  const hotel = (data.hotelBooking ?? {}) as AnyRecord;
  return {
    id: String(data._id ?? data.id ?? ""),
    bookingNumber: String(data.bookingNumber ?? ""),
    status: String(data.bookingStatus ?? "pending"),
    totalAmount: Number(data.totalAmount ?? 0),
    nights: Number(hotel.nights ?? data.nights ?? 0),
  };
}
