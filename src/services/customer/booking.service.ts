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
