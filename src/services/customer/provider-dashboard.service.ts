import { customerGet, customerPost, customerPut } from "@/lib/customer-api";

type Row = Record<string, unknown>;
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const text = (value: unknown) => (value == null ? "" : String(value));

export type DashboardSummary = {
  businessName: string;
  rating: number;
  totalReviews: number;
  todaysTrips: number;
  bookedSeatsToday: number;
  availableSeatsToday: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
    pendingPayout: number;
    net: number;
  };
};

/** `GET /providers/dashboard` — the same numbers as the app's dashboard. */
export async function getProviderDashboard(): Promise<DashboardSummary> {
  const data = await customerGet<Row>("/providers/dashboard");
  const provider = (data.provider ?? {}) as Row;
  const transport = (data.transport ?? {}) as Row;
  const general = (data.general ?? {}) as Row;
  const earnings = (data.earnings ?? {}) as Row;
  return {
    businessName: text(provider.businessName),
    rating: num(provider.rating),
    totalReviews: num(provider.totalReviews),
    todaysTrips: num(transport.todaysTrips),
    bookedSeatsToday: num(transport.bookedSeats),
    availableSeatsToday: num(transport.availableSeats),
    totalBookings: num(general.totalBookings),
    pendingBookings: num(general.pendingBookings),
    completedBookings: num(general.completedBookings),
    earnings: {
      today: num(earnings.todayRevenue ?? earnings.today),
      thisWeek: num(earnings.weeklyRevenue ?? earnings.thisWeek),
      thisMonth: num(earnings.monthlyRevenue ?? earnings.thisMonth),
      total: num(earnings.totalRevenue),
      pendingPayout: num(earnings.pendingPayout),
      net: num(earnings.netEarnings),
    },
  };
}

export type ProviderTrip = {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  price: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  status: string;
  bookingMode: string;
};

/** The provider's own trips (`GET /trips` returns only theirs). */
export async function getMyTrips(): Promise<ProviderTrip[]> {
  const data = await customerGet<unknown>("/trips");
  return (Array.isArray(data) ? (data as Row[]) : []).map((trip) => ({
    id: text(trip._id ?? trip.id),
    origin: text(trip.origin),
    destination: text(trip.destination),
    departureDate: text(trip.departureDate).slice(0, 10),
    departureTime: text(trip.departureTime),
    price: num(trip.price),
    totalSeats: num(trip.totalSeats),
    bookedSeats: num(trip.bookedSeats),
    availableSeats: num(trip.availableSeats),
    status: text(trip.status),
    bookingMode: text(trip.bookingMode),
  }));
}

export type ProviderBooking = {
  id: string;
  number: string;
  customerName: string;
  seats: string[];
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

/** Bookings travellers made with this provider, newest first. */
export async function getProviderBookings(limit = 20): Promise<ProviderBooking[]> {
  const data = await customerGet<Row>("/providers/bookings", { params: { limit } });
  const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []) as Row[];
  return items.map((booking) => {
    const transport = (booking.transportBooking ?? {}) as Row;
    return {
      id: text(booking._id ?? booking.id),
      number: text(booking.bookingNumber),
      customerName: text(booking.customerName) || "Traveller",
      seats: Array.isArray(transport.seats) ? transport.seats.map(String) : [],
      amount: num(booking.totalAmount),
      status: text(booking.bookingStatus),
      paymentStatus: text(booking.paymentStatus),
      createdAt: text(booking.createdAt),
    };
  });
}

export type ProviderReview = { id: string; rating: number; comment: string; author: string; createdAt: string };

/** Public reviews travellers left for this provider. */
export async function getProviderReviews(providerId: string): Promise<ProviderReview[]> {
  const data = await customerGet<unknown>(`/reviews/provider/${providerId}`);
  const items = (Array.isArray(data) ? data : Array.isArray((data as Row)?.items) ? (data as Row).items : []) as Row[];
  return items.map((review) => ({
    id: text(review._id ?? review.id),
    rating: num(review.rating),
    comment: text(review.comment ?? review.text),
    author: text((review.customer as Row | undefined)?.name ?? review.customerName) || "Traveller",
    createdAt: text(review.createdAt),
  }));
}

/* ------------------------------------------------------------------ */
/* Section pages                                                       */
/* ------------------------------------------------------------------ */

export type ProviderEarnings = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  pendingPayout: number;
  completedPayout: number;
  platformFees: number;
  net: number;
  feePercent: number;
};

/** `GET /providers/earnings`. */
export async function getProviderEarnings(): Promise<ProviderEarnings> {
  const e = await customerGet<Row>("/providers/earnings");
  return {
    today: num(e.todayRevenue ?? e.today),
    thisWeek: num(e.weeklyRevenue ?? e.thisWeek),
    thisMonth: num(e.monthlyRevenue ?? e.thisMonth),
    total: num(e.totalRevenue),
    pendingPayout: num(e.pendingPayout),
    completedPayout: num(e.completedPayout),
    platformFees: num(e.platformFees),
    net: num(e.netEarnings),
    feePercent: num(e.platformFeePercent),
  };
}

export type ProviderNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export async function getProviderNotifications(): Promise<ProviderNotification[]> {
  const data = await customerGet<Row>("/notifications", { params: { limit: 50 } });
  const items = (Array.isArray(data?.items) ? data.items : []) as Row[];
  return items.map((n) => ({
    id: text(n._id ?? n.id),
    title: text(n.title),
    message: text(n.message),
    type: text(n.type),
    read: Boolean(n.isRead),
    createdAt: text(n.createdAt),
  }));
}

export async function markAllNotificationsRead() {
  await customerPut("/notifications/read-all", {});
}

/** Approve (`confirmed`) or decline (`rejected`) a booking request, like the app. */
export async function setBookingStatus(id: string, status: "confirmed" | "rejected") {
  await customerPut(`/providers/bookings/${id}/status`, { status });
}

/* ------------------------------------------------------------------ */
/* Bookings (full detail, like the app's Booking Details)              */
/* ------------------------------------------------------------------ */

export type BookingDetail = ProviderBooking & {
  paymentId: string;
  /** The traveller's user id — who to message about this booking. */
  customerId: string;
  customerPhone: string;
  customerEmail: string;
  passengers: Array<{ name: string; phone: string }>;
  route: string;
  origin: string;
  destination: string;
  tripId: string;
  tripDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  journeyType: string;
  bookingMode: string;
  tripStatus: string;
  pickup: string;
  pickupAddress: string;
  dropoff: string;
  dropoffAddress: string;
  vehicleName: string;
  vehicleType: string;
  vehiclePlate: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  serviceFee: number;
  discount: number;
  currency: string;
  bookingType: string;
  /** City to City rides only: door-to-door details. */
  intercity: {
    rideRequestId: string;
    leg: string;
    rideType: string;
    pickupAddress: string;
    pickupLat: number | null;
    pickupLng: number | null;
    dropoffAddress: string;
    dropoffLat: number | null;
    dropoffLng: number | null;
    luggage: { bags: number; large: number };
    passengers: number;
    notes: string;
  } | null;
  fareBreakdown: { leg: string; lines: Array<{ code: string; label: string; amount: number }> } | null;
  /** The other leg of a City to City round trip. */
  returnBookingId: string;
  outboundBookingId: string;
  /** Hotel stays only. */
  stay: {
    hotelName: string;
    roomName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    rooms: number;
    guests: number;
    /** booked → checked_in → checked_out */
    status: string;
    specialRequests: string;
  } | null;
};

function mapBookingDetail(b: Row): BookingDetail {
  const detail = mapTransportDetail(b);
  if (text(b.bookingType) !== "hotel") return detail;
  // A hotel stay, shaped so the shared lists and cards read sensibly.
  const guest = (b.guestDetails ?? {}) as Row;
  const stay = {
    hotelName: text(b.hotelName),
    roomName: text(b.roomName),
    checkIn: text(b.checkIn).slice(0, 10),
    checkOut: text(b.checkOut).slice(0, 10),
    nights: num(b.nights),
    rooms: num(b.roomsCount) || 1,
    guests: num(b.guestsCount) || 1,
    status: text(b.stayStatus) || "booked",
    specialRequests: text(b.specialRequests),
  };
  return {
    ...detail,
    route: [stay.roomName, stay.hotelName].filter(Boolean).join(" · ") || "Stay",
    tripDate: stay.checkIn,
    departureTime: "",
    arrivalDate: stay.checkOut,
    passengers: guest.name ? [{ name: text(guest.name), phone: text(guest.phone) }] : detail.passengers,
    customerPhone: detail.customerPhone || text(guest.phone),
    customerEmail: detail.customerEmail || text(guest.email),
    stay,
  };
}

function mapTransportDetail(b: Row): BookingDetail {
  const transport = (b.transportBooking ?? {}) as Row;
  const passengers = (Array.isArray(b.passengerDetails) ? b.passengerDetails : Array.isArray(transport.passengerDetails) ? transport.passengerDetails : []) as Row[];
  const seats = Array.isArray(b.seats) ? b.seats : Array.isArray(transport.seats) ? transport.seats : [];
  return {
    id: text(b._id ?? b.id),
    paymentId: text(b.paymentId),
    customerId: text(
      b.customerId && typeof b.customerId === "object"
        ? ((b.customerId as Row)._id ?? (b.customerId as Row).id)
        : b.customerId,
    ),
    number: text(b.bookingNumber),
    customerName: text(b.customerName) || "Traveller",
    seats: (seats as unknown[]).map(String),
    amount: num(b.totalAmount),
    status: text(b.bookingStatus),
    paymentStatus: text(b.paymentStatus),
    createdAt: text(b.createdAt),
    customerPhone: text(b.customerPhone),
    customerEmail: text(b.customerEmail),
    passengers: passengers.map((p) => ({ name: text(p.name), phone: text(p.phone) })),
    route: text(b.routeLabel) || [b.tripOrigin, b.tripDestination].filter(Boolean).join(" → "),
    origin: text(b.tripOrigin),
    destination: text(b.tripDestination),
    tripId: text(b.tripId ?? transport.tripId),
    tripDate: text(b.tripDate).slice(0, 10),
    departureTime: text(b.tripDepartureTime),
    arrivalDate: text(b.tripArrivalDate).slice(0, 10),
    arrivalTime: text(b.tripArrivalTime),
    journeyType: text(b.tripJourneyType),
    bookingMode: text(b.tripBookingMode),
    tripStatus: text(b.tripStatus),
    pickup: text(b.pickupName),
    pickupAddress: text(b.pickupAddress),
    dropoff: text(b.dropoffName),
    dropoffAddress: text(b.dropoffAddress),
    vehicleName: text(b.vehicleName),
    vehicleType: text(b.vehicleType),
    vehiclePlate: text(b.vehiclePlate),
    paymentMethod: text(b.paymentMethod),
    subtotal: num(b.subtotal),
    tax: num(b.tax),
    serviceFee: num(b.serviceFee),
    discount: num(b.discount),
    currency: text(b.currency) || "PKR",
    bookingType: text(b.bookingType) || "transport",
    intercity: mapIntercity(transport.intercity),
    fareBreakdown: mapFareBreakdown(b.fareBreakdown),
    returnBookingId: text(b.returnBookingId),
    outboundBookingId: text(b.outboundBookingId),
    stay: null,
  };
}

const coord = (value: unknown) => (value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value));

function mapIntercity(raw: unknown): BookingDetail["intercity"] {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Row;
  const luggage = (i.luggage ?? {}) as Row;
  return {
    rideRequestId: text(i.rideRequestId),
    leg: text(i.leg),
    rideType: text(i.rideType),
    pickupAddress: text(i.pickupAddress),
    pickupLat: coord(i.pickupLat),
    pickupLng: coord(i.pickupLng),
    dropoffAddress: text(i.dropoffAddress),
    dropoffLat: coord(i.dropoffLat),
    dropoffLng: coord(i.dropoffLng),
    luggage: { bags: num(luggage.bags), large: num(luggage.large) },
    passengers: num(i.passengers),
    notes: text(i.notes),
  };
}

function mapFareBreakdown(raw: unknown): BookingDetail["fareBreakdown"] {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Row;
  const lines = (Array.isArray(f.lines) ? f.lines : []) as Row[];
  return {
    leg: text(f.leg),
    lines: lines.map((line) => ({ code: text(line.code), label: text(line.label), amount: num(line.amount) })),
  };
}

/** All bookings with trip, passenger and payment details. */
export async function getProviderBookingDetails(limit = 100): Promise<BookingDetail[]> {
  const data = await customerGet<Row>("/providers/bookings", { params: { limit } });
  const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []) as Row[];
  return items.map(mapBookingDetail);
}

/** One booking (`GET /bookings/:id`; providers can read their own). */
export async function getBookingDetail(id: string): Promise<BookingDetail> {
  return mapBookingDetail(await customerGet<Row>(`/bookings/${id}`));
}

/** Records that the traveller paid a cash booking in person. */
export async function markCashReceived(id: string) {
  await customerPut(`/providers/bookings/${id}/cash-received`, {});
}

/** Hotel stays: the guest arrived / left. Check-out completes the booking. */
export async function checkInGuest(id: string) {
  await customerPut(`/providers/hotel/bookings/${id}/check-in`, {});
}

export async function checkOutGuest(id: string) {
  await customerPut(`/providers/hotel/bookings/${id}/check-out`, {});
}

/** Marks a confirmed booking completed after the trip, like the app. */
export async function completeBooking(id: string) {
  await customerPut(`/providers/bookings/${id}/status`, { status: "completed" });
}

/* ------------------------------------------------------------------ */
/* Payment check (the app's "Verify payment")                          */
/* ------------------------------------------------------------------ */

export type BookingPayment = {
  id: string;
  status: string;
  method: string;
  amount: number;
  transactionId: string;
  expiresAt: string;
  amountMismatch: boolean;
  proof: {
    referenceNumber: string;
    paidAmount: number;
    paidAt: string;
    note: string;
    /** Short-lived signed links to the receipt images the traveller uploaded. */
    receipts: string[];
  } | null;
};

/** Cash and pay-at-hotel are settled in person; everything else needs a payment check. */
export const isOnlinePayment = (method: string) => !["", "cash", "payAtHotel"].includes(method);

export async function getBookingPayment(paymentId: string): Promise<BookingPayment> {
  const p = await customerGet<Row>(`/payments/${paymentId}`);
  const proof = p.proof as Row | undefined;
  return {
    id: text(p.id ?? p._id),
    status: text(p.status),
    method: text(p.method),
    amount: num(p.amount),
    transactionId: text(p.transactionId),
    expiresAt: text(p.expiresAt),
    amountMismatch: Boolean(p.amountMismatch),
    proof: proof
      ? {
          referenceNumber: text(proof.referenceNumber),
          paidAmount: num(proof.paidAmount),
          paidAt: text(proof.paidAt),
          note: text(proof.note),
          receipts: Array.isArray(proof.receiptUrls)
            ? proof.receiptUrls.map(text).filter((url) => /^https?:\/\//.test(url))
            : [],
        }
      : null,
  };
}

/** Confirms the money arrived; the backend confirms the booking with it. */
export async function confirmBookingPayment(paymentId: string) {
  await customerPost(`/payments/${paymentId}/confirm`, {});
}

export const PAYMENT_ISSUES = [
  { value: "not_received", label: "Money not received" },
  { value: "incorrect_amount", label: "Wrong amount" },
  { value: "incorrect_account", label: "Sent to the wrong account" },
  { value: "invalid_receipt", label: "Receipt looks invalid" },
  { value: "transaction_not_found", label: "Transaction not found" },
  { value: "duplicate_payment", label: "Paid twice" },
  { value: "other", label: "Something else" },
] as const;

export async function reportPaymentIssue(paymentId: string, reason: string, note?: string) {
  await customerPost(`/payments/${paymentId}/report-issue`, { reason, note: note?.trim() || undefined });
}
