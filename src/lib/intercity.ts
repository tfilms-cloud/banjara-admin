/**
 * City to City (intercity) rides: pure helpers shared by the rider form, the request
 * page and the driver's section. No React and no `@/` imports, so `node --test` can
 * load this file directly.
 */

export type VehicleClassKey = "car" | "suv" | "jeep" | "van" | "coaster";
export type RideType = "full_car" | "shared_seat";
export type JourneyType = "one_way" | "round_trip";
export type WaitMode = "hourly" | "overnight";
export type FareMode = "fixed" | "bid";
export type RequestStatus = "open" | "matched" | "expired" | "cancelled";

export type PlacePoint = { address: string; lat: number; lng: number };

export type IntercityClass = { key: VehicleClassKey; seats: number };

export type ReturnTripInput = {
  departAt: string;
  waitMode: WaitMode;
  waitHours?: number;
  nights?: number;
};

/** Body of `POST /intercity/quote` (and the base of a ride request). */
export type QuoteBody = {
  pickup: PlacePoint;
  dropoff: PlacePoint;
  vehicleClass: VehicleClassKey;
  rideType: RideType;
  passengers: number;
  journeyType: JourneyType;
  returnTrip?: ReturnTripInput;
};

export const CLASS_LABELS: Record<VehicleClassKey, string> = {
  car: "Car",
  suv: "SUV",
  jeep: "Jeep",
  van: "Van / Hiace",
  coaster: "Coaster",
};

export function classLabel(key: string): string {
  return CLASS_LABELS[key as VehicleClassKey] ?? key;
}

/** 13400 → "Rs 13,400". */
export function formatRupees(amount: number): string {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rs ${value.toLocaleString("en-PK")}`;
}

const FIVE_MINUTES = 5 * 60_000;

/** Earliest departure a rider may schedule: now + lead time, rounded up to the next 5 minutes. */
export function minDepartAt(now: Date, minLeadMinutes: number): Date {
  const earliest = now.getTime() + Math.max(0, minLeadMinutes) * 60_000;
  return new Date(Math.ceil(earliest / FIVE_MINUTES) * FIVE_MINUTES);
}

/** Pakistan has no daylight saving, so its offset is always +05:00. */
const PKT_OFFSET = "+05:00";

/** A Date as the values of a date and a time input, in Pakistan time. */
export function toPakistanInputs(date: Date): { date: string; time: string } {
  const shifted = new Date(date.getTime() + 5 * 3_600_000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Date and time inputs (Pakistan time) → Date, or null when either is missing or invalid. */
export function fromPakistanInputs(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00${PKT_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "Sat 7 Nov, 3:30 pm" in Pakistan time. */
export function formatPakistanTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Lowest price a rider may offer: `minOfferPercent`% of the fare, rounded up to a rupee. */
export function offerFloor(subtotal: number, minOfferPercent: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return Math.ceil((subtotal * Math.max(0, minOfferPercent)) / 100);
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Waiting for drivers",
  matched: "Booked",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function requestStatusLabel(status: string): string {
  return STATUS_LABELS[status as RequestStatus] ?? status;
}

/** Digits only, keeping a leading "+": the API accepts `+?\d{10,15}`. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  return (trimmed.startsWith("+") ? "+" : "") + trimmed.replace(/\D/g, "");
}

export type RideFormValues = {
  pickup: PlacePoint | null;
  dropoff: PlacePoint | null;
  bookNow: boolean;
  /** Ignored when `bookNow`. */
  departAt: Date | null;
  vehicleClass: VehicleClassKey;
  rideType: RideType;
  passengers: number;
  journeyType: JourneyType;
  returnAt: Date | null;
  waitMode: WaitMode;
  waitHours: number;
  nights: number;
  fareMode: FareMode;
  offerAmount: number | null;
  /** From the latest quote, to check an offer against its floor. */
  subtotal: number | null;
  passengerName: string;
  passengerPhone: string;
};

export type RideFormField =
  | "pickup"
  | "dropoff"
  | "departAt"
  | "returnAt"
  | "waitHours"
  | "nights"
  | "passengers"
  | "rideType"
  | "offerAmount"
  | "passengerName"
  | "passengerPhone";

export type RideFormErrors = Partial<Record<RideFormField, string>>;

export type RideFormConfig = {
  classes: IntercityClass[];
  minLeadMinutes: number;
  minOfferPercent: number;
};

/** Field errors for the rider's form; an empty object means it can be sent. */
export function validateRideForm(values: RideFormValues, config: RideFormConfig, now = new Date()): RideFormErrors {
  const errors: RideFormErrors = {};
  if (!values.pickup) errors.pickup = "Choose where the driver picks you up.";
  if (!values.dropoff) errors.dropoff = "Choose where you are going.";

  const departure = values.bookNow ? now : values.departAt;
  if (!values.bookNow) {
    if (!values.departAt) errors.departAt = "Choose a departure date and time.";
    else if (values.departAt.getTime() < now.getTime() + config.minLeadMinutes * 60_000)
      errors.departAt = `Schedule at least ${config.minLeadMinutes} minutes from now, or choose “Leave now”.`;
  }

  const seats = config.classes.find((c) => c.key === values.vehicleClass)?.seats ?? 0;
  if (!Number.isInteger(values.passengers) || values.passengers < 1) errors.passengers = "Add at least one passenger.";
  else if (seats && values.passengers > seats)
    errors.passengers = `A ${classLabel(values.vehicleClass)} takes up to ${seats} passengers.`;

  if (values.journeyType === "round_trip") {
    if (values.rideType === "shared_seat") errors.rideType = "Shared seats are one-way only.";
    if (!values.returnAt) errors.returnAt = "Choose when you want to come back.";
    else if (departure && values.returnAt.getTime() <= departure.getTime())
      errors.returnAt = "The return must be after the departure.";
    if (values.waitMode === "hourly" && !(values.waitHours > 0 && values.waitHours <= 72))
      errors.waitHours = "Enter how many hours the driver waits (1–72).";
    if (values.waitMode === "overnight" && !(Number.isInteger(values.nights) && values.nights >= 1 && values.nights <= 14))
      errors.nights = "Enter how many nights the driver stays (1–14).";
  }

  if (values.fareMode === "bid") {
    const floor = offerFloor(values.subtotal ?? 0, config.minOfferPercent);
    if (values.offerAmount == null || !Number.isInteger(values.offerAmount) || values.offerAmount <= 0)
      errors.offerAmount = "Enter the price you want to offer, in whole rupees.";
    else if (values.offerAmount < floor) errors.offerAmount = `Offer at least ${formatRupees(floor)}.`;
  }

  if (values.passengerName.trim().length < 2) errors.passengerName = "Enter the passenger’s name.";
  if (!/^\+?\d{10,15}$/.test(normalizePhone(values.passengerPhone)))
    errors.passengerPhone = "Enter a phone number the driver can call (e.g. 03XX XXXXXXX).";
  return errors;
}

/** The quote body once the route is complete enough to price, else null. */
export function buildQuoteBody(values: RideFormValues): QuoteBody | null {
  if (!values.pickup || !values.dropoff || values.passengers < 1) return null;
  const body: QuoteBody = {
    pickup: values.pickup,
    dropoff: values.dropoff,
    vehicleClass: values.vehicleClass,
    rideType: values.rideType,
    passengers: values.passengers,
    journeyType: values.rideType === "shared_seat" ? "one_way" : values.journeyType,
  };
  if (body.journeyType === "round_trip") {
    if (!values.returnAt) return null;
    body.returnTrip = {
      departAt: values.returnAt.toISOString(),
      waitMode: values.waitMode,
      ...(values.waitMode === "hourly" ? { waitHours: values.waitHours } : { nights: values.nights }),
    };
  }
  return body;
}

/** A driver's last known position older than this is shown as "last seen". */
export const STALE_LOCATION_MS = 2 * 60_000;

export function isLocationStale(at: string | Date | null | undefined, now = new Date()): boolean {
  if (!at) return true;
  const time = new Date(at).getTime();
  return !Number.isFinite(time) || now.getTime() - time > STALE_LOCATION_MS;
}

/** "Last seen just now" / "Last seen 6 min ago" / "Last seen 2 h ago". */
export function lastSeenLabel(at: string | Date, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(at).getTime()) / 60_000));
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours} h ago`;
  return `Last seen ${formatPakistanTime(at)}`;
}

/* Nearby drivers and rides ------------------------------------------ */

export type NearbySummaryInput = {
  radiusKm: number;
  steps: number[];
  widened: boolean;
  nextRadiusKm: number | null;
  found: number;
};

/** The note above the nearby map, or null when results were found at the first step. */
export function nearbyMessage({ radiusKm, steps, widened, nextRadiusKm, found }: NearbySummaryInput): string | null {
  if (!found) {
    const widest = nextRadiusKm == null;
    return widest
      ? `No drivers or rides within ${radiusKm} km yet. You can still send a request — drivers further away may see it as we widen the search.`
      : `No drivers or rides within ${radiusKm} km. Try a wider search.`;
  }
  if (widened && steps.length) return `No rides within ${steps[0]} km — showing ${radiusKm} km`;
  return null;
}

/** "~3 km away" (one decimal under 1 km). */
export function distanceLabel(km: number): string {
  if (!Number.isFinite(km)) return "";
  return km < 1 ? `~${Math.max(0.1, Math.round(km * 10) / 10)} km away` : `~${Math.round(km)} km away`;
}

/** After this long with no offers, the request page suggests searching wider. */
export const WIDEN_HINT_MS = 2 * 60_000;

export function shouldSuggestWiden(
  request: { status: string; offers: unknown[]; createdAt: string; nextRadiusKm: number | null; lastWidenedAt?: string | null },
  now = new Date(),
): boolean {
  if (request.status !== "open" || request.offers.length || request.nextRadiusKm == null) return false;
  const since = new Date(request.lastWidenedAt || request.createdAt).getTime();
  return Number.isFinite(since) && now.getTime() - since >= WIDEN_HINT_MS;
}
