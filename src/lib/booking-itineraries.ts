import type {
  ItineraryBooking,
  BookingCategory,
  BookingKind,
  BookingTab,
  BookingPass,
} from "@/types/customer/itinerary-booking";
import type { TripWithDetails } from "@/types/customer/trip";
import type { Hotel, HotelRoom } from "@/types/customer/hotel";

type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData =>
  value && typeof value === "object" ? (value as RecordData) : {};
export const bookingId = (value: unknown): string =>
  typeof value === "string"
    ? value
    : String(record(value)._id ?? record(value).id ?? "");
const text = (value: unknown) => (value == null ? "" : String(value));
const count = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const strings = (value: unknown) =>
  Array.isArray(value) ? value.map(String) : [];
export const BOOKING_CATEGORIES: { id: BookingCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transport", label: "Transport" },
  { id: "hotel", label: "Hotels" },
  { id: "tour", label: "Tours & Treks" },
  { id: "guide", label: "Guides" },
];
export const BOOKING_TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
export function mapItineraryBooking(
  raw: RecordData,
  related: {
    trip?: TripWithDetails | null;
    hotel?: Hotel | null;
    room?: HotelRoom | null;
    provider?: RecordData | null;
    itinerary?: RecordData | null;
  } = {},
): ItineraryBooking | null {
  const kind: BookingKind | undefined = (
    {
      transport: "transport",
      hotel: "hotel",
      package: "tour",
      guide: "guide",
    } as const
  )[text(raw.bookingType) as "transport" | "hotel" | "package" | "guide"];
  if (!kind || !bookingId(raw)) return null;
  const transport = record(raw.transportBooking),
    hotelBooking = record(raw.hotelBooking),
    tour = record(raw.packageBooking),
    guide = record(raw.guideBooking);
  const { trip, hotel, room } = related;
  const provider = related.provider ?? {};
  const providerName = text(
    raw.providerBusinessName ||
      provider.businessName ||
      trip?.agency.name ||
      hotel?.managerName,
  );
  const providerGuide = record(provider.guideDetails ?? provider.tour);
  const hotelDetails = record(provider.hotelDetails);
  const date = text(
    kind === "transport"
      ? raw.tripDate || trip?.date
      : kind === "hotel"
        ? hotelBooking.checkIn
        : kind === "tour"
          ? tour.startDate
          : guide.date,
  ).slice(0, 10);
  const title =
    kind === "transport"
      ? providerName || "Transport booking"
      : kind === "hotel"
        ? hotel?.name || text(raw.hotelName) || "Hotel stay"
        : kind === "tour"
          ? text(tour.title || raw.packageTitle) || "Tour booking"
          : providerName || text(providerGuide.fullName) || "Private guide";
  return {
    id: bookingId(raw),
    code: text(raw.bookingNumber),
    kind,
    status: text(raw.bookingStatus || "pending"),
    paymentStatus: text(raw.paymentStatus || "unpaid"),
    paymentId: bookingId(raw.paymentId),
    providerId: bookingId(raw.providerId),
    providerUserId: bookingId(raw.providerUserId || provider.userId),
    providerName,
    providerPhone: text(
      provider.phone ||
        providerGuide.phone ||
        hotel?.phone ||
        trip?.agency.phone,
    ),
    providerEmail: text(
      provider.email ||
        providerGuide.email ||
        hotel?.email ||
        trip?.agency.email,
    ),
    title,
    subtitle:
      kind === "transport"
        ? trip?.vehicleName || text(raw.vehicleName)
        : kind === "hotel"
          ? room?.name || text(raw.roomName)
          : kind === "tour"
            ? text(tour.destination || raw.packageDestination)
            : text(guide.serviceName),
    image:
      kind === "hotel"
        ? room?.images[0] || hotel?.images[0] || ""
        : kind === "tour"
          ? text(raw.packageCoverImage || related.itinerary?.coverImage)
          : kind === "guide"
            ? text(provider.logo || providerGuide.profilePhoto)
            : trip?.image || "",
    date,
    endDate:
      kind === "hotel"
        ? text(hotelBooking.checkOut)
        : kind === "tour"
          ? addCalendarDays(date, Math.max(0, count(tour.durationDays, 1) - 1))
          : date,
    time:
      kind === "transport"
        ? trip?.departureTime || text(raw.tripDepartureTime)
        : kind === "hotel"
          ? hotel?.checkInTime || ""
          : text(guide.startTime),
    endTime:
      kind === "transport"
        ? trip?.arrivalTime || text(raw.tripArrivalTime)
        : kind === "guide"
          ? text(guide.endTime)
          : "",
    total: count(raw.totalAmount),
    subtotal: count(raw.subtotal),
    tax: count(raw.tax),
    serviceFee: count(raw.serviceFee),
    discount: count(raw.discount),
    currency: text(raw.currency || "PKR"),
    seats: strings(transport.seats ?? raw.seats),
    guests:
      kind === "hotel"
        ? count(hotelBooking.guests, 1)
        : kind === "tour"
          ? count(tour.travelers, 1)
          : kind === "guide"
            ? count(guide.guests, 1)
            : Math.max(strings(transport.seats).length, 1),
    rooms: count(hotelBooking.rooms),
    nights:
      count(hotelBooking.nights) ||
      Math.max(
        0,
        count(
          (Date.parse(text(hotelBooking.checkOut)) -
            Date.parse(text(hotelBooking.checkIn))) /
            86400000,
        ),
      ),
    createdAt: text(raw.createdAt),
    from: trip?.from || text(raw.tripOrigin),
    to: trip?.to || text(raw.tripDestination),
    pickup:
      text(raw.pickupName) ||
      trip?.pickupLocations.find(
        (p) => p.id === bookingId(transport.pickupPoint),
      )?.name ||
      "",
    dropoff: text(raw.dropoffName),
    vehicle: [
      trip?.vehicleName || raw.vehicleName,
      trip?.vehiclePlate || raw.vehiclePlate,
    ]
      .filter(Boolean)
      .join(" · "),
    journey: trip?.journeyType || text(raw.tripJourneyType),
    bookingMode:
      trip?.bookingMode === "vehicle" || raw.tripBookingMode === "vehicle"
        ? "vehicle"
        : "seat",
    roomName: room?.name || text(raw.roomName),
    bedType: room?.bedType || "",
    checkInTime: hotel?.checkInTime || "",
    checkOutTime: hotel?.checkOutTime || "",
    amenities:
      kind === "hotel"
        ? [
            ...new Set([
              ...(room?.amenities ?? []),
              ...(room?.breakfastIncluded ? ["Breakfast included"] : []),
            ]),
          ]
        : kind === "transport"
          ? (trip?.amenities ?? [])
          : strings(
              kind === "tour"
                ? (tour.included ?? related.itinerary?.included)
                : providerGuide.guideTypes,
            ),
    cancellationPolicy: hotel?.cancellationPolicy || "",
    location:
      kind === "hotel"
        ? hotel?.location.address || text(hotelDetails.address)
        : kind === "guide"
          ? text(guide.meetingPoint || guide.availableLocation)
          : text(tour.destination),
    duration:
      kind === "tour"
        ? `${count(tour.durationDays, 1)} days`
        : kind === "guide" && count(guide.durationHours) > 0
          ? `${count(guide.durationHours)} hours`
          : trip?.durationMinutes
            ? `${Math.floor(trip.durationMinutes / 60)}h ${trip.durationMinutes % 60}m`
            : "",
    tripId: bookingId(transport.tripId),
    hotelId: bookingId(hotelBooking.hotelId),
    itineraryId: bookingId(tour.itineraryId),
    serviceName: text(guide.serviceName),
    notes: text(
      guide.specialRequest ||
        record(hotelBooking.guestDetails).specialRequests ||
        record(tour.guestDetails).specialRequests,
    ),
    detailsUnavailable:
      kind === "transport"
        ? !trip
        : kind === "hotel"
          ? !hotel || !room
          : !related.provider,
  };
}
export function addCalendarDays(date: string, days: number) {
  const value = Date.parse(date);
  return Number.isFinite(value)
    ? new Date(value + days * 86400000).toISOString().slice(0, 10)
    : "";
}
export function bookingTab(status: string): BookingTab {
  return status === "completed"
    ? "completed"
    : ["cancelled", "refunded", "expired"].includes(status)
      ? "cancelled"
      : "upcoming";
}
export function bookingTimestamp(booking: ItineraryBooking) {
  const timestamp = Date.parse(
    `${booking.date}T${/^\d{2}:\d{2}$/.test(booking.time) ? booking.time : "00:00"}:00+05:00`,
  );
  return Number.isFinite(timestamp) ? timestamp : Infinity;
}
export function readBookingFilters(params: URLSearchParams) {
  return {
    status:
      BOOKING_TABS.find((tab) => tab.id === params.get("status"))?.id ??
      ("upcoming" as BookingTab),
    category:
      BOOKING_CATEGORIES.find((c) => c.id === params.get("category"))?.id ??
      ("all" as BookingCategory),
    query: (params.get("q") ?? "").slice(0, 160),
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get("month") ?? "")
      ? params.get("month")!
      : "all",
  };
}
export function filterBookingItineraries(
  bookings: ItineraryBooking[],
  filters: ReturnType<typeof readBookingFilters>,
) {
  const term = filters.query.trim().toLowerCase();
  return bookings
    .filter(
      (b) =>
        bookingTab(b.status) === filters.status &&
        (filters.category === "all" || b.kind === filters.category) &&
        (filters.month === "all" || b.date.startsWith(filters.month)) &&
        (!term ||
          [
            b.code,
            b.title,
            b.subtitle,
            b.providerName,
            b.from,
            b.to,
            b.location,
            b.date,
            ...b.seats,
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    )
    .sort((a, b) => {
      const first = bookingTimestamp(a),
        second = bookingTimestamp(b);
      if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
      if (!Number.isFinite(second)) return -1;
      return filters.status === "upcoming" ? first - second : second - first;
    });
}
export function bookingStatusLabel(status: string) {
  return (
    (
      {
        pending: "Awaiting provider approval",
        confirmed: "Confirmed",
        completed: "Completed",
        cancelled: "Cancelled",
        refunded: "Refunded",
        expired: "Expired",
        payment_verification: "Payment verification",
        disputed: "Under review",
        upcoming: "Upcoming",
      } as Record<string, string>
    )[status] ?? "Status pending"
  );
}
export function paymentStatusLabel(status: string) {
  return (
    (
      {
        paid: "Paid",
        confirmed: "Payment confirmed",
        unpaid: "Payment due",
        pending: "Payment pending",
        payment_initiated: "Payment initiated",
        proof_submitted: "Proof submitted",
        under_review: "Payment under review",
        rejected: "Payment rejected",
        disputed: "Payment disputed",
        failed: "Payment failed",
        refunded: "Refunded",
        refund_pending: "Refund pending",
        expired: "Payment expired",
      } as Record<string, string>
    )[status] ?? "Payment status pending"
  );
}
export function hasPaymentDue(booking: ItineraryBooking) {
  return (
    bookingTab(booking.status) === "upcoming" &&
    booking.total > 0 &&
    ["unpaid", "pending", "payment_initiated", "failed", "rejected"].includes(
      booking.paymentStatus,
    )
  );
}
export function canDownloadPass(booking: ItineraryBooking) {
  return ["confirmed", "completed"].includes(booking.status);
}
export function canCancelItinerary(booking: ItineraryBooking) {
  return !["cancelled", "completed", "refunded", "expired"].includes(
    booking.status,
  );
}
export function bookingMoney(amount: number, currency = "PKR") {
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-PK")}`;
  }
}
export function bookingDate(date: string) {
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }).format(timestamp)
    : "Date to be confirmed";
}
export function bookingTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function offlineItineraryHtml(
  bookings: ItineraryBooking[],
  passes: Record<string, BookingPass> = {},
  generatedAt = new Date().toISOString(),
) {
  const escape = (value: unknown) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const generationLabel = Number.isFinite(Date.parse(generatedAt))
    ? `${new Date(generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })} PKT`
    : generatedAt;
  const cards = bookings
    .map((b) => {
      const qr = passes[b.id]?.qrCode;
      return `<article><h2>${escape(b.title)}</h2><p>${escape(b.code)} · ${escape(bookingStatusLabel(b.status))}</p><p>${escape(bookingDate(b.date))}${b.endDate && b.endDate !== b.date ? ` – ${escape(bookingDate(b.endDate))}` : ""} ${escape(bookingTime(b.time))}</p><p>${escape(b.from && b.to ? `${b.from} → ${b.to}` : b.subtitle || b.location)}</p><p>${escape(b.guests)} guest(s)${b.rooms ? ` · ${escape(b.rooms)} room(s)` : ""}${b.bookingMode === "vehicle" ? " · Private vehicle" : b.seats.length ? ` · Seats ${escape(b.seats.join(", "))}` : ""}</p><p>${escape(bookingMoney(b.total, b.currency))} · ${escape(paymentStatusLabel(b.paymentStatus))}</p>${qr && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr) ? `<img width="180" height="180" alt="Booking QR code" src="${qr}" />` : ""}</article>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BANJARA itinerary</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#243b34;max-width:850px;margin:40px auto;padding:0 24px;background:#fff}h1{color:#0f9b98}article{border:1px solid #deded6;border-radius:20px;padding:24px;margin:20px 0;break-inside:avoid}h2{margin-top:0}small{color:#62756b}@media print{body{margin:0}article{box-shadow:none}}</style><h1>BANJARA · Bookings & Itineraries</h1><small>Exported ${escape(generationLabel)}. Booking and payment statuses are a snapshot; check BANJARA for updates.</small>${cards || "<p>No bookings in this export.</p>"}</html>`;
}
