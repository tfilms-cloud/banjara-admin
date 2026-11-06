import { asArray, idOf } from "@/lib/utils";
import type {
  CustomerBooking,
  HotelBooking,
  TransportBooking,
} from "@/types/customer/booking";
import type { Hotel, HotelRoom, HotelType } from "@/types/customer/hotel";
import type {
  Agency,
  PickupPoint,
  TripWithDetails,
  VehicleType,
} from "@/types/customer/trip";
import type { AuthUser } from "@/types/auth";

export type AnyRecord = Record<string, unknown>;

export function normalizeMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((segment) => {
        if (!segment) return segment;
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join("/");
    return parsed.toString();
  } catch {
    return trimmed.replace(/ /g, "%20");
  }
}

function mediaUrl(value: unknown): string | undefined {
  return normalizeMediaUrl(value ? String(value) : undefined);
}

function mediaUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => mediaUrl(item)).filter(Boolean) as string[];
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}

function parseDurationMinutes(departure: string, arrival: string): number {
  const [dh, dm] = departure.split(":").map(Number);
  const [ah, am] = arrival.split(":").map(Number);
  if ([dh, dm, ah, am].some((n) => Number.isNaN(n))) return 0;
  let mins = ah * 60 + am - (dh * 60 + dm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function mapVehicleType(type: unknown): VehicleType {
  const value = String(type ?? "van").toLowerCase();
  if (
    value === "bus" ||
    value === "car" ||
    value === "tour" ||
    value === "private"
  ) {
    return value;
  }
  return "van";
}

/** The provider behind a ride. Rides are offered by individual local drivers. */
function mapAgency(provider: AnyRecord | undefined, fallbackId = ""): Agency {
  const p = provider ?? {};
  const transport = (p.transportDetails ?? {}) as AnyRecord;
  const driverName =
    String(transport.driverName ?? "").trim() || String(p.ownerName ?? "").trim();
  return {
    id: idOf(p) || fallbackId,
    userId: idOf(p.userId) || undefined,
    name: driverName || String(p.businessName ?? p.name ?? "Provider"),
    logo: mediaUrl(transport.driverPhoto) ?? mediaUrl(p.logo) ?? "",
    rating: Number(p.rating ?? 0),
    reviewCount: Number(p.totalReviews ?? p.reviewCount ?? 0),
    phone: String(p.phone ?? ""),
    email: String(p.email ?? ""),
    description: String(p.description ?? ""),
    verified: String(p.verificationStatus ?? "") === "approved",
    city: String(p.city ?? "").trim() || undefined,
  };
}

export function mapPickupPoint(raw: AnyRecord, tripId?: string): PickupPoint {
  const latitude = Number(raw.latitude),
    longitude = Number(raw.longitude);
  return {
    id: idOf(raw),
    name: String(raw.name ?? raw.label ?? "Pickup point"),
    address: String(raw.address ?? "").trim() || undefined,
    tripId,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    landmark: typeof raw.landmark === "string" ? raw.landmark : undefined,
    latitude:
      raw.latitude != null &&
      Number.isFinite(latitude) &&
      Math.abs(latitude) <= 90
        ? latitude
        : undefined,
    longitude:
      raw.longitude != null &&
      Number.isFinite(longitude) &&
      Math.abs(longitude) <= 180
        ? longitude
        : undefined,
  };
}

export function mapCustomerUser(raw: AnyRecord): AuthUser {
  return {
    id: idOf(raw),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    role: (raw.role as AuthUser["role"]) ?? "customer",
    status: raw.status ? String(raw.status) : undefined,
    avatar: mediaUrl(raw.avatar),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    providerId: raw.providerId ? idOf(raw.providerId) || String(raw.providerId) : undefined,
    providerStatus: raw.providerStatus
      ? (String(raw.providerStatus) as AuthUser["providerStatus"])
      : undefined,
  };
}

export function mapTrip(raw: AnyRecord): TripWithDetails {
  const provider =
    raw.providerId && typeof raw.providerId === "object"
      ? (raw.providerId as AnyRecord)
      : undefined;
  const vehicle =
    raw.vehicleId && typeof raw.vehicleId === "object"
      ? (raw.vehicleId as AnyRecord)
      : undefined;

  const pickupLocations = asArray<AnyRecord>(raw.pickupPoints)
    .filter((p) => typeof p === "object")
    .map((p) => mapPickupPoint(p, idOf(raw)));

  const image =
    mediaUrl(
      (Array.isArray(vehicle?.images) && vehicle?.images[0]) ||
        (Array.isArray(raw.images) && (raw.images as string[])[0]) ||
        "",
    ) ?? "";

  const agencyId = idOf(raw.providerId);

  return {
    id: idOf(raw),
    agencyId,
    vehicleId: idOf(raw.vehicleId),
    from: String(raw.origin ?? raw.from ?? ""),
    to: String(raw.destination ?? raw.to ?? ""),
    departureTime: String(raw.departureTime ?? ""),
    arrivalTime: String(raw.arrivalTime ?? ""),
    durationMinutes: parseDurationMinutes(
      String(raw.departureTime ?? ""),
      String(raw.arrivalTime ?? ""),
    ),
    date: String(raw.departureDate ?? raw.date ?? ""),
    price: Number(raw.price ?? 0),
    currency: "PKR",
    availableSeats: Number(raw.availableSeats ?? 0),
    totalSeats: Number(raw.totalSeats ?? 0),
    rating: Number(provider?.rating ?? raw.rating ?? 0),
    amenities: (Array.isArray(raw.amenities) ? raw.amenities : []).map(String),
    image,
    popular: Boolean(raw.popular),
    recommended:
      Boolean(raw.recommended) || Number(provider?.rating ?? 0) >= 4.5,
    journeyType:
      String(raw.journeyType ?? "one_way") === "round_trip"
        ? "round_trip"
        : "one_way",
    returnDate: raw.returnDate ? String(raw.returnDate) : undefined,
    description: String(raw.description ?? "").trim() || undefined,
    status: String(raw.status ?? "").trim() || undefined,
    agency: mapAgency(provider, agencyId),
    vehicleType: mapVehicleType(vehicle?.type),
    vehicleName: String(vehicle?.name ?? "Vehicle"),
    vehicleCategory:
      String(
        asRecord(vehicle?.verificationDetails)?.vehicleClass ||
          vehicle?.type ||
          "",
      ).trim() || undefined,
    vehicleClass:
      String(
        vehicle?.vehicleClass ??
          (["coaster", "suv", "minibus", "tourVehicle", "other"].includes(
            String(vehicle?.type),
          )
            ? vehicle?.type
            : ""),
      ).trim() || undefined,
    bookingMode: raw.bookingMode === "vehicle" ? "vehicle" : "seat",
    vehicleBrand: String(vehicle?.brand ?? "").trim() || undefined,
    vehicleModel: String(vehicle?.vehicleModel ?? "").trim() || undefined,
    vehiclePlate: vehicle?.registrationNumber
      ? String(vehicle.registrationNumber)
      : undefined,
    vehicleCapacity:
      Number(vehicle?.seatCount ?? raw.totalSeats ?? 0) || undefined,
    vehicleImages: mediaUrls(
      Array.isArray(vehicle?.images) ? vehicle.images : image ? [image] : [],
    ),
    pickupLocations,
    dropoffLocations: asArray<AnyRecord>(raw.dropoffPoints)
      .filter((p) => typeof p === "object")
      .map((p) => mapPickupPoint(p, idOf(raw))),
    arrivalDate:
      typeof raw.arrivalDate === "string" ? raw.arrivalDate : undefined,
    returnTime: typeof raw.returnTime === "string" ? raw.returnTime : undefined,
    vehicleYear: Number(vehicle?.year) || undefined,
    seatLayout: asArray<AnyRecord>(raw.seatLayout)
      .map((s) => ({
        seatNumber: String(s.seatNumber || ""),
        status: String(s.status || ""),
      }))
      .filter((s) => s.seatNumber),
    stops: asArray<unknown>(raw.stops ?? asRecord(raw.routeId)?.stops)
      .map((s) =>
        typeof s === "string"
          ? { name: s }
          : {
              name: String(asRecord(s)?.name || ""),
              description:
                typeof asRecord(s)?.description === "string"
                  ? String(asRecord(s)?.description)
                  : undefined,
              time:
                typeof asRecord(s)?.time === "string"
                  ? String(asRecord(s)?.time)
                  : undefined,
            },
      )
      .filter((s) => s.name),
  };
}

function mapHotelType(value: unknown): HotelType {
  const raw = String(value ?? "hotel")
    .replace(/[_-\s]/g, "")
    .toLowerCase();
  if (raw === "resort") return "resort";
  if (raw === "lodge") return "lodge";
  if (raw === "homestay") return "homestay";
  if (raw === "guesthouse") return "guest_house";
  return "hotel";
}

export function mapHotel(raw: AnyRecord): Hotel {
  const coords = Array.isArray(
    (raw.location as AnyRecord | undefined)?.coordinates,
  )
    ? ((raw.location as AnyRecord).coordinates as number[])
    : [0, 0];

  return {
    id: idOf(raw),
    providerId: idOf(raw.providerId),
    providerUserId: raw.providerUserId ? String(raw.providerUserId) : undefined,
    managerName: String(raw.managerName ?? "").trim() || undefined,
    yearsExperience: Number(raw.yearsExperience ?? 0) || undefined,
    restaurantAvailable: Boolean(raw.restaurantAvailable),
    businessRegistered: Boolean(raw.businessRegistered),
    website: String(raw.website ?? "").trim() || undefined,
    status: String(raw.status ?? "").trim() || undefined,
    approvalStatus: String(raw.approvalStatus ?? "").trim() || undefined,
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    images: mediaUrls(raw.images),
    location: {
      city: String(raw.city ?? ""),
      area: String(raw.area ?? raw.address ?? ""),
      address: String(raw.address ?? ""),
      latitude: Number(coords[1] ?? raw.latitude ?? 0),
      longitude: Number(coords[0] ?? raw.longitude ?? 0),
      distanceKm: Number(raw.distanceKm ?? 0),
    },
    rating: Number(raw.rating ?? 0),
    reviewCount: Number(raw.reviewCount ?? 0),
    hotelType: mapHotelType(raw.hotelType),
    amenities: (Array.isArray(raw.amenities) ? raw.amenities : []).map(String),
    checkInTime: String(raw.checkInTime ?? "14:00"),
    checkOutTime: String(raw.checkOutTime ?? "12:00"),
    cancellationPolicy: String(raw.cancellationPolicy ?? ""),
    priceFrom: Number(raw.priceFrom ?? 0),
    featured: Boolean(raw.featured),
    popular: Boolean(raw.popular) || Number(raw.rating ?? 0) >= 4.5,
    isVerified: Boolean(raw.isVerified),
    freeCancellation: String(raw.cancellationPolicy ?? "")
      .toLowerCase()
      .includes("free cancellation"),
    breakfastIncluded: (Array.isArray(raw.amenities) ? raw.amenities : []).some(
      (item) => String(item).toLowerCase().includes("breakfast"),
    ),
    phone: String(raw.phone ?? ""),
    email: String(raw.email ?? ""),
  };
}

export function mapHotelRoom(raw: AnyRecord): HotelRoom {
  return {
    id: idOf(raw),
    hotelId: idOf(raw.hotelId),
    name: String(raw.name ?? ""),
    images: mediaUrls(raw.images),
    bedType: String(raw.bedType ?? ""),
    capacity: Number(raw.capacity ?? 1),
    sizeSqm: Number(raw.size ?? raw.sizeSqm ?? 0),
    amenities: (Array.isArray(raw.amenities) ? raw.amenities : []).map(String),
    breakfastIncluded: Boolean(raw.breakfastIncluded),
    freeCancellation: String(raw.cancellationPolicy ?? "")
      .toLowerCase()
      .includes("free cancellation"),
    pricePerNight: Number(raw.pricePerNight ?? 0),
    availableRooms: Number(raw.availableRooms ?? raw.totalRooms ?? 0),
    description: String(raw.description ?? raw.roomType ?? ""),
    roomType: String(raw.roomType ?? ""),
    cancellationPolicy: String(raw.cancellationPolicy ?? ""),
    status: String(raw.status ?? ""),
  };
}

function mapBookingStatus(status: string): TransportBooking["status"] {
  if (status === "pending" || status === "confirmed") return "upcoming";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "refunded") return "cancelled";
  return (status as TransportBooking["status"]) || "upcoming";
}

function mapPaymentMethod(method: unknown): TransportBooking["paymentMethod"] {
  const value = String(method ?? "card");
  if (value === "mobileWallet" || value === "wallet") return "wallet";
  if (value === "cash" || value === "payAtHotel") return "cash";
  return "card";
}

export function toBackendPaymentMethod(
  method: TransportBooking["paymentMethod"],
): "bankTransfer" | "easypaisa" | "cash" {
  if (method === "wallet") return "easypaisa";
  if (method === "cash") return "cash";
  return "bankTransfer";
}

export function mapTransportBooking(raw: AnyRecord): TransportBooking {
  const transport = asRecord(raw.transportBooking) ?? {};
  const passengers = asArray<AnyRecord>(transport.passengerDetails);
  const firstPassenger = passengers[0] ?? {};
  const trip = asRecord(transport.tripId);

  return {
    id: idOf(raw),
    bookingCode: String(raw.bookingNumber ?? raw.bookingCode ?? ""),
    bookingType: "transport",
    tripId: idOf(transport.tripId),
    userId: idOf(raw.customerId),
    providerId: idOf(raw.providerId),
    date: String(raw.createdAt ?? new Date().toISOString()).slice(0, 10),
    seats: asArray<string>(transport.seats).map(String),
    pickupPoint: transport.pickupPoint
      ? String(transport.pickupPoint)
      : undefined,
    passengerName: String(firstPassenger.name ?? ""),
    passengerPhone: String(firstPassenger.phone ?? ""),
    status: mapBookingStatus(String(raw.bookingStatus ?? "pending")),
    paymentMethod: mapPaymentMethod(raw.paymentMethod),
    paymentStatus: String(
      raw.paymentStatus ?? "pending",
    ) as TransportBooking["paymentStatus"],
    totalAmount: Number(raw.totalAmount ?? raw.amount ?? 0),
    currency: "PKR",
    from: trip ? String(trip.origin ?? trip.from ?? "") : undefined,
    to: trip ? String(trip.destination ?? trip.to ?? "") : undefined,
    departureTime: trip ? String(trip.departureTime ?? "") : undefined,
    agencyName: trip
      ? String(
          asRecord(trip.providerId)?.businessName ??
            asRecord(trip.providerId)?.name ??
            "",
        )
      : undefined,
  };
}

export function mapHotelBooking(raw: AnyRecord): HotelBooking {
  const hotel = asRecord(raw.hotelBooking) ?? {};
  const guest = asRecord(hotel.guestDetails) ?? {};
  const hotelRef = asRecord(hotel.hotelId);

  return {
    id: idOf(raw),
    bookingCode: String(raw.bookingNumber ?? ""),
    bookingType: "hotel",
    hotelId: idOf(hotel.hotelId),
    roomId: idOf(hotel.roomId),
    userId: idOf(raw.customerId),
    providerId: idOf(raw.providerId),
    checkIn: String(hotel.checkIn ?? ""),
    checkOut: String(hotel.checkOut ?? ""),
    guests: Number(hotel.guests ?? 1),
    rooms: Number(hotel.rooms ?? 1),
    guestName: String(guest.name ?? ""),
    guestPhone: String(guest.phone ?? ""),
    status: mapBookingStatus(String(raw.bookingStatus ?? "pending")),
    paymentMethod: mapPaymentMethod(raw.paymentMethod),
    paymentStatus: String(
      raw.paymentStatus ?? "pending",
    ) as HotelBooking["paymentStatus"],
    totalAmount: Number(raw.totalAmount ?? raw.amount ?? 0),
    currency: "PKR",
    hotelName: hotelRef ? String(hotelRef.name ?? "") : undefined,
  };
}

export function mapCustomerBooking(raw: AnyRecord): CustomerBooking {
  if (String(raw.bookingType ?? "") === "hotel") {
    return mapHotelBooking(raw);
  }
  return mapTransportBooking(raw);
}
