import { customerGet, customerPost } from "@/lib/customer-api";
import { serverGet } from "@/lib/server-api";
import { mapGuideAvailability, mapGuideProfile, mapGuideReviews, guideBookingPayload } from "@/lib/guide-details";
import { asArray, idOf } from "@/lib/utils";
import type { GuideGuest, GuidePlan, GuideProfile } from "@/types/customer/guide";

type Data = Record<string, unknown>;
const read = <T,>(path: string) => typeof window === "undefined" ? serverGet<T>(path) : customerGet<T>(path);
export async function getGuideById(id: string) {
  const guide = mapGuideProfile(await read<Data>(`/providers/public/${encodeURIComponent(id)}`));
  if (!guide || guide.id !== id) throw new Error("This guide is no longer available.");
  return guide;
}
export async function getGuideAvailability(id: string) { return mapGuideAvailability(await read<Data>(`/guides/${encodeURIComponent(id)}/availability`)); }
export async function getGuideReviews(id: string) { return mapGuideReviews(asArray(await read<unknown>(`/reviews/provider/${encodeURIComponent(id)}`))); }
export async function createGuideBooking(guide: GuideProfile, plan: GuidePlan, guest: GuideGuest, paymentMethod: "bankTransfer" | "easypaisa" | "cash") {
  const result = await customerPost<Data>("/bookings", guideBookingPayload(guide, plan, guest, paymentMethod));
  return { id: idOf(result), code: String(result.bookingNumber || ""), total: Number(result.totalAmount) };
}
