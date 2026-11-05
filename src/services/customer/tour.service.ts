import { customerGet, customerPost } from "@/lib/customer-api";
import { serverGet } from "@/lib/server-api";
import {
  mapTourItinerary,
  mapTourOperator,
  packageBookingPayload,
} from "@/lib/tour-details";
import { asArray, idOf } from "@/lib/utils";
import type { TourGuest, TourItinerary, TourPlan } from "@/types/customer/tour";

type RecordData = Record<string, unknown>;
async function read<T>(path: string, params?: Record<string, string | number>) {
  return typeof window === "undefined"
    ? serverGet<T>(path, params)
    : customerGet<T>(path, { params });
}
export async function getPublishedTour(id: string): Promise<TourItinerary> {
  const item = mapTourItinerary(
    await read<RecordData>(`/tour-itineraries/${encodeURIComponent(id)}`),
  );
  if (item.status !== "published" || item.id !== id)
    throw new Error("This tour is no longer available.");
  return item;
}
export async function getTourOperator(id: string) {
  const operator = mapTourOperator(
    await read<RecordData>(`/providers/public/${encodeURIComponent(id)}`),
  );
  if (operator.id !== id)
    throw new Error("Operator details could not be loaded.");
  return operator;
}
export async function getOperatorTours(providerId: string) {
  const data = await read<unknown>("/tour-itineraries", {
    providerId,
    limit: 100,
  });
  return asArray<RecordData>(data)
    .map(mapTourItinerary)
    .filter(
      (tour) => tour.providerId === providerId && tour.status === "published",
    );
}
export async function createTourBooking(
  tourId: string,
  plan: TourPlan,
  guest: TourGuest,
  paymentMethod: "bankTransfer" | "easypaisa" | "cash",
) {
  const result = await customerPost<RecordData>(
    "/bookings",
    packageBookingPayload(tourId, plan, guest, paymentMethod),
  );
  return {
    id: idOf(result),
    code: String(result.bookingNumber ?? ""),
    total: Number(result.totalAmount),
    currency: String(result.currency || "PKR"),
  };
}
