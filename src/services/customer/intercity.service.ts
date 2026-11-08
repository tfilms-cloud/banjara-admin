import { customerGet, customerPost, customerPut } from "@/lib/customer-api";
import type {
  FareMode,
  IntercityClass,
  JourneyType,
  PlacePoint,
  QuoteBody,
  RequestStatus,
  RideType,
  VehicleClassKey,
  WaitMode,
} from "@/lib/intercity";
import type { BufferedPoint } from "@/lib/location-buffer";

/** City to City rides: door-to-door trips between the cities BANJARA serves. */

export type IntercityConfig =
  | { enabled: false }
  | {
      enabled: true;
      classes: IntercityClass[];
      minLeadMinutes: number;
      freeCancelMinutes: number;
      noShowWaitMinutes: number;
      minOfferPercent: number;
      waitingPerHour: number;
      overnightCharge: number;
    };
export type EnabledIntercityConfig = Extract<IntercityConfig, { enabled: true }>;

export type IntercityCity = { id: string; name: string; province: string; lat: number; lng: number; radiusKm: number };

export type FareLine = { code: string; label: string; amount: number };

export type IntercityQuote = {
  fromCity: IntercityCity;
  toCity: IntercityCity;
  durationMinutes: number;
  source: "route" | "formula";
  distanceKm: number;
  lines: FareLine[];
  outbound: number;
  returnLeg: number;
  subtotal: number;
  bidAllowed: boolean;
  tax: number;
  serviceFee: number;
  total: number;
};

export type Luggage = { bags: number; large: number };

export type RideRequestInput = QuoteBody & {
  bookNow: boolean;
  departAt?: string;
  luggage?: Luggage;
  passengerName: string;
  passengerPhone: string;
  notes?: string;
  offerAmount?: number;
};

export type RideOffer = {
  id: string;
  amount: number;
  kind: "accept" | "counter";
  status: "pending" | "chosen";
  createdAt: string;
  driver: { providerId: string; name: string; rating: number; totalReviews: number } | null;
  vehicle: { name: string; type: string; seats: number } | null;
};

export type RidePlace = PlacePoint & { city: string };

export type RideRequest = {
  id: string;
  status: RequestStatus;
  rideType: RideType;
  journeyType: JourneyType;
  pickup: RidePlace;
  dropoff: RidePlace;
  departAt: string;
  bookNow: boolean;
  returnTrip: { departAt: string; waitMode: WaitMode; waitHours?: number; nights?: number } | null;
  vehicleClass: VehicleClassKey;
  passengers: number;
  luggage: Luggage;
  quote: Omit<IntercityQuote, "tax" | "serviceFee" | "total">;
  fareMode: FareMode;
  riderOffer: number | null;
  estimate: { subtotal: number; tax: number; serviceFee: number; total: number };
  offers: RideOffer[];
  bookingId: string | null;
  returnBookingId: string | null;
  /** The trips the bookings run on, for live tracking. */
  tripId: string | null;
  returnTripId: string | null;
  /** How far drivers are searched for now, and the next step (null at the widest). */
  searchRadiusKm: number;
  nextRadiusKm: number | null;
  expiresAt: string;
  createdAt: string;
};

export type SharedTrip = {
  tripId: string;
  route: string;
  departAt: string;
  pricePerSeat: number;
  seatsLeft: number;
  freeSeats: string[];
  driver: { name: string; rating: number } | null;
  vehicle: { name: string; type: string; seats: number } | null;
};

const id = (value: string) => encodeURIComponent(value);

/* Public ------------------------------------------------------------ */

export const getIntercityConfig = () => customerGet<IntercityConfig>("/intercity/config");

/** Shared by every page that hides itself while the feature is off. */
export const intercityConfigQuery = {
  queryKey: ["intercity", "config"],
  queryFn: getIntercityConfig,
  staleTime: 5 * 60_000,
};

export const getIntercityCities = async () => (await customerGet<IntercityCity[] | null>("/intercity/cities")) ?? [];

export const getIntercityQuote = (body: QuoteBody) => customerPost<IntercityQuote>("/intercity/quote", body);

/* Rider ------------------------------------------------------------- */

export const createRideRequest = (body: RideRequestInput) => customerPost<RideRequest>("/intercity/requests", body);

export const listRideRequests = async () => (await customerGet<RideRequest[] | null>("/intercity/requests")) ?? [];

export const getRideRequest = (requestId: string) => customerGet<RideRequest>(`/intercity/requests/${id(requestId)}`);

export const cancelRideRequest = (requestId: string) =>
  customerPost<RideRequest>(`/intercity/requests/${id(requestId)}/cancel`, {});

export const chooseOffer = (requestId: string, offerId: string) =>
  customerPost<RideRequest>(`/intercity/requests/${id(requestId)}/choose`, { offerId });

export const listSharedTrips = async (requestId: string) =>
  (await customerGet<SharedTrip[] | null>(`/intercity/requests/${id(requestId)}/shared-trips`)) ?? [];

export const joinSharedTrip = (requestId: string, tripId: string) =>
  customerPost<RideRequest>(`/intercity/requests/${id(requestId)}/join`, { tripId });

/** 409 ("Already searching the widest area …") at the last step. */
export const widenRideRequest = (requestId: string) =>
  customerPost<RideRequest>(`/intercity/requests/${id(requestId)}/widen`, {});

/* Nearby ------------------------------------------------------------ */

export type NearbyDriver = {
  providerId: string;
  name: string;
  rating: number;
  totalReviews: number;
  vehicles: Array<{ class: string; seats: number }>;
  /** Registered base rounded to about 1 km, not a live position. */
  approxLat: number;
  approxLng: number;
  distanceKm: number;
};

export type NearbyRide = {
  tripId: string;
  route: string;
  departureDate: string;
  departureTime: string;
  price: number;
  bookingMode: "seat" | "vehicle";
  seatsLeft: number;
  rideType: "scheduled" | "intercity";
  boardAt: string;
  lat: number;
  lng: number;
  distanceKm: number;
};

export type NearbyResult = {
  radiusKm: number;
  steps: number[];
  widened: boolean;
  nextRadiusKm: number | null;
  drivers: NearbyDriver[];
  rides: NearbyRide[];
};

/** Without `radiusKm` the API widens on its own to the first step that has something. */
export async function getNearby(params: {
  lat: number;
  lng: number;
  vehicleClass?: VehicleClassKey;
  radiusKm?: number;
}): Promise<NearbyResult> {
  const data = await customerGet<NearbyResult>("/intercity/nearby", { params });
  return { ...data, steps: data.steps ?? [], drivers: data.drivers ?? [], rides: data.rides ?? [] };
}

/* Driver ------------------------------------------------------------ */

export type DriverRoute = { fromCityId: string; toCityId: string };

export type DriverIntercitySettings = {
  enabled: boolean;
  homeCityId: string | null;
  preferredRoutes: DriverRoute[];
  acceptsShared: boolean;
  featureEnabled: boolean;
};

export type DriverIntercitySettingsInput = {
  enabled: boolean;
  homeCityId?: string | null;
  preferredRoutes?: DriverRoute[];
  acceptsShared?: boolean;
};

export type DriverRideRequest = {
  id: string;
  status: RequestStatus;
  rideType: RideType;
  journeyType: JourneyType;
  route: string;
  pickupArea: string;
  dropoffArea: string;
  departAt: string;
  bookNow: boolean;
  returnTrip: RideRequest["returnTrip"];
  vehicleClass: VehicleClassKey;
  passengers: number;
  luggage: Luggage;
  distanceKm: number;
  fare: number;
  fareMode: FareMode;
  canCounter: boolean;
  myOffer: { id: string; amount: number; kind: "accept" | "counter"; status: string } | null;
  expiresAt: string;
};

export type DriverUpcomingTrip = {
  tripId: string;
  route: string;
  departAt: string;
  leg: "outbound" | "return";
  status: string;
  bookingMode: string;
  seatsLeft: number;
  bookings: Array<{ id: string; number: string; total: number; status: string }>;
};

export const getDriverIntercitySettings = () => customerGet<DriverIntercitySettings>("/intercity/driver/settings");

export const saveDriverIntercitySettings = (input: DriverIntercitySettingsInput) =>
  customerPut<DriverIntercitySettings>("/intercity/driver/settings", input);

/** What the driver owes BANJARA (shown on the requests board; blocked drivers get no requests). */
export type DriverBalanceBanner = {
  owed: number;
  pendingPayments: number;
  blocked: boolean;
  message: string | null;
  maxDriverDue: number;
  commissionPercent: number;
};

export async function getDriverRideRequests(): Promise<{
  requests: DriverRideRequest[];
  upcoming: DriverUpcomingTrip[];
  balance: DriverBalanceBanner | null;
}> {
  const data = await customerGet<{
    requests?: DriverRideRequest[];
    upcoming?: DriverUpcomingTrip[];
    balance?: DriverBalanceBanner;
  } | null>("/intercity/driver/requests");
  return { requests: data?.requests ?? [], upcoming: data?.upcoming ?? [], balance: data?.balance ?? null };
}

export type PayChannel = "easypaisa" | "jazzcash" | "bank" | "raast" | "other";

export type LedgerEntry = {
  id: string;
  kind: "commission" | "payment";
  status: "posted" | "pending" | "approved" | "rejected";
  amount: number;
  createdAt: string;
  bookingNumber: string | null;
  fare: number | null;
  percent: number | null;
  route: string | null;
  channel: PayChannel | null;
  reference: string | null;
  rejectionReason: string | null;
};

export type DriverBalance = DriverBalanceBanner & {
  dueSince: string | null;
  blockReason: "over_limit" | "overdue" | null;
  maxDueDays: number;
  payTo: Array<{ channel: PayChannel; accountTitle: string; accountNumber: string; note?: string }>;
  entries: LedgerEntry[];
};

/** BANJARA's 10% commission on completed City to City rides, owed by the driver. */
export const getDriverBalance = () => customerGet<DriverBalance>("/intercity/driver/balance");

export const reportCommissionPayment = (input: { amount: number; channel: PayChannel; reference: string; note?: string }) =>
  customerPost<LedgerEntry>("/intercity/driver/balance/payments", input);

export const respondToRideRequest = (requestId: string, action: "accept" | "decline" | "counter", amount?: number) =>
  customerPost<unknown>(`/intercity/driver/requests/${id(requestId)}/respond`, {
    action,
    ...(action === "counter" ? { amount } : {}),
  });

export const setIntercityTripStatus = (tripId: string, status: "departed" | "completed") =>
  customerPut<unknown>(`/intercity/driver/trips/${id(tripId)}/status`, { status });

/** 409 (with the API's message) until the no-show wait has passed. */
export const markRideNoShow = (bookingId: string) =>
  customerPost<unknown>(`/intercity/driver/bookings/${id(bookingId)}/no-show`, {});

export type TripLocation = { lat: number; lng: number; at: string };

export const sendTripLocations = (tripId: string, points: BufferedPoint[]) =>
  customerPost<{ accepted: number; lastLocation: TripLocation | null }>(`/intercity/trips/${id(tripId)}/locations`, {
    points,
  });

export const getTripLocation = (tripId: string) =>
  customerGet<{ tripId: string; status: string; lastLocation: TripLocation | null }>(
    `/intercity/trips/${id(tripId)}/location`,
  );
