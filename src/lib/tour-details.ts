import type {
  TourGuest,
  TourItinerary,
  TourOperator,
  TourPlan,
} from "../types/customer/tour";

type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordData)
    : {};
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const identity = (value: unknown): string =>
  typeof value === "string"
    ? value
    : text(record(value)._id ?? record(value).id);
const strings = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
const media = (value: unknown) => {
  const source = text(value);
  return /^(https?:\/\/|\/(?!\/))/i.test(source)
    ? source.replace(/ /g, "%20")
    : "";
};
export function mapTourItinerary(raw: RecordData): TourItinerary {
  const duration = Number(raw.durationDays);
  return {
    id: identity(raw),
    providerId: identity(raw.providerId),
    title: text(raw.title),
    tourType: text(raw.tourType),
    summary: text(raw.summary),
    description: text(raw.description),
    destination: text(raw.destination),
    region: text(raw.region),
    durationDays: duration,
    durationNights:
      raw.durationNights == null ? undefined : Number(raw.durationNights),
    difficulty: text(raw.difficulty),
    maxParticipants: Number(raw.maxParticipants),
    pricePerPerson: Number(raw.pricePerPerson),
    currency: text(raw.currency).toUpperCase() || "PKR",
    included: strings(raw.included),
    excluded: strings(raw.excluded),
    days: (Array.isArray(raw.days) ? raw.days : [])
      .map(record)
      .map((day) => ({
        dayNumber: Number(day.dayNumber),
        title: text(day.title),
        description: text(day.description),
      }))
      .filter(
        (day) =>
          Number.isInteger(day.dayNumber) &&
          day.dayNumber > 0 &&
          day.dayNumber <= duration &&
          !!day.title,
      )
      .sort((a, b) => a.dayNumber - b.dayNumber),
    coverImage: media(raw.coverImage),
    images: strings(raw.images).map(media).filter(Boolean),
    departureLocation: text(raw.departureLocation),
    bestSeason: text(raw.bestSeason),
    status: text(raw.status),
  };
}
export function mapTourOperator(raw: RecordData): TourOperator {
  const tour = record(raw.tourDetails);
  return {
    id: identity(raw),
    userId: identity(raw.userId),
    name: text(raw.businessName) || text(tour.companyName) || "Tour operator",
    logo: media(raw.logo),
    description: text(raw.description) || text(tour.description),
    city: text(raw.city),
    phone: text(raw.phone),
    email: text(raw.email),
    verified: raw.verificationStatus === "approved",
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.totalReviews) || 0,
    yearsExperience: Number(raw.yearsExperience) || 0,
  };
}
export function tourPhotos(tour: TourItinerary) {
  return [...new Set([tour.coverImage, ...tour.images].filter(Boolean))];
}
export function tourTravelerLimit(tour: TourItinerary) {
  return Number.isInteger(tour.maxParticipants) && tour.maxParticipants > 0
    ? Math.min(200, tour.maxParticipants)
    : 0;
}
export function tourCanReserve(tour: TourItinerary) {
  return (
    tour.status === "published" &&
    !!tour.id &&
    !!tour.providerId &&
    tourTravelerLimit(tour) > 0 &&
    Number.isInteger(tour.durationDays) &&
    tour.durationDays > 0 &&
    Number.isFinite(tour.pricePerPerson) &&
    tour.pricePerPerson >= 0 &&
    tour.currency === "PKR"
  );
}
export function validTourDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function readTourPlan(
  params: URLSearchParams,
  tour: TourItinerary,
  today: string,
): TourPlan {
  const date = params.get("startDate") || "";
  const travelers = Number(params.get("travelers"));
  return {
    startDate: validTourDate(date) && date >= today ? date : today,
    travelers:
      Number.isInteger(travelers) && travelers >= 1
        ? Math.min(travelers, tourTravelerLimit(tour) || 1)
        : 1,
  };
}
export function validateTourPlan(
  tour: TourItinerary,
  plan: TourPlan,
  today: string,
) {
  if (!tourCanReserve(tour))
    return tour.currency !== "PKR"
      ? "Contact the operator to book this package in its listed currency."
      : "This package is not accepting reservations.";
  if (!validTourDate(plan.startDate) || plan.startDate < today)
    return "Choose a valid start date today or later.";
  if (
    !Number.isInteger(plan.travelers) ||
    plan.travelers < 1 ||
    plan.travelers > tourTravelerLimit(tour)
  )
    return `Choose between 1 and ${tourTravelerLimit(tour)} travelers.`;
  return "";
}
export function tourEndDate(tour: TourItinerary, start: string) {
  if (
    !validTourDate(start) ||
    !Number.isInteger(tour.durationDays) ||
    tour.durationDays < 1
  )
    return "";
  const date = new Date(start);
  date.setUTCDate(date.getUTCDate() + tour.durationDays - 1);
  return date.toISOString().slice(0, 10);
}
export function tourPlanQuery(plan: TourPlan) {
  return new URLSearchParams({
    startDate: plan.startDate,
    travelers: String(plan.travelers),
  });
}
export function tourBookingHref(tour: TourItinerary, plan: TourPlan) {
  return `/tours/${encodeURIComponent(tour.id)}/book?${tourPlanQuery(plan)}`;
}
export function tourBaseFare(tour: TourItinerary, travelers: number) {
  return Number.isFinite(tour.pricePerPerson) &&
    Number.isInteger(travelers) &&
    travelers > 0 &&
    travelers <= tourTravelerLimit(tour)
    ? tour.pricePerPerson * travelers
    : 0;
}
export function tourGuestError(guest: TourGuest) {
  if (guest.name.trim().length < 2)
    return "Enter the lead traveler’s full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()))
    return "Enter a valid email address.";
  const digits = guest.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15)
    return "Enter a valid phone number with country or area code.";
  return "";
}
export function packageBookingPayload(
  tourId: string,
  plan: TourPlan,
  guest: TourGuest,
  paymentMethod: "bankTransfer" | "easypaisa" | "cash",
) {
  return {
    bookingType: "package",
    paymentMethod,
    packageBooking: {
      itineraryId: tourId,
      startDate: plan.startDate,
      travelers: plan.travelers,
      guestDetails: {
        name: guest.name.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim(),
        specialRequests: guest.specialRequests?.trim() || undefined,
      },
    },
  };
}
