import { customerDel, customerGet, customerPost, customerPut } from "@/lib/customer-api";
import { asArray, idOf } from "@/lib/utils";

/**
 * Lodging (hotel, guest house, lodge, hostel) for its owner: the application steps
 * on the website and, after approval, rooms and availability. Field names match what
 * the BANJARA app saves (`hotelDetails`), so either can pick up where the other left.
 */

export const LODGING_TYPES = [
  { value: "hotel", label: "Hotel" },
  { value: "guestHouse", label: "Guest house" },
  { value: "lodge", label: "Lodge" },
  { value: "hostel", label: "Hostel" },
] as const;

export const PROPERTY_AMENITIES = [
  "WiFi",
  "Parking",
  "Hot water",
  "Heating",
  "Power backup",
  "Room service",
  "Laundry",
  "Garden",
  "Mountain view",
  "Airport pickup",
] as const;

export const ROOM_TYPES = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "twin", label: "Twin" },
  { value: "deluxe", label: "Deluxe" },
  { value: "suite", label: "Suite" },
  { value: "family", label: "Family" },
] as const;
export type RoomType = (typeof ROOM_TYPES)[number]["value"];

export const ROOM_AMENITIES = [
  "Attached bathroom",
  "Hot water",
  "Heater",
  "WiFi",
  "TV",
  "Balcony",
  "Mountain view",
  "Wardrobe",
  "Tea / kettle",
] as const;

export type HotelDetails = {
  hotelName?: string;
  hotelType?: string;
  managerName?: string;
  landline?: string;
  phone?: string;
  email?: string;
  address?: string;
  village?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  businessRegistered?: string;
  businessRegistrationNumber?: string;
  yearsExperience?: number;
  website?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTiktok?: string;
  restaurantAvailable?: "yes" | "no" | "";
  outlookImages?: string[];
  roomImages?: string[];
  restaurantImages?: string[];
  images?: string[];
  description?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: string[];
  [key: string]: unknown;
};

export type LodgingProfile = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  city: string;
  address: string;
  yearsExperience: number;
  location: { latitude: number; longitude: number } | null;
  /** From the map pin (step 4), to pre-fill the property's village and district. */
  pinned: { area: string; district: string };
  details: HotelDetails;
  verificationStatus: string;
  progress: { nextStep: string; completedSteps: string[]; rooms: number } | null;
};

type Raw = Record<string, unknown>;

/** "…, Lower Hunza Tehsil, Hunza District, Gilgit Division, …" → "Hunza". */
function districtFrom(address: string) {
  const part = address
    .split(",")
    .map((p) => p.trim())
    .find((p) => / District$/i.test(p));
  return part ? part.replace(/ District$/i, "").trim() : "";
}

export async function getLodgingProfile(): Promise<LodgingProfile> {
  const data = await customerGet<Raw>("/providers/me");
  const coords = (data.location as { coordinates?: unknown } | undefined)?.coordinates;
  const [lng, lat] = Array.isArray(coords) ? coords.map(Number) : [];
  const progress = data.onboardingProgress as Raw | undefined;
  const structured = data.structuredAddress as Raw | undefined;
  return {
    businessName: String(data.businessName ?? ""),
    ownerName: String(data.ownerName ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    description: String(data.description ?? ""),
    city: String(data.city ?? ""),
    address: String(structured?.formattedAddress ?? data.address ?? ""),
    yearsExperience: Number(data.yearsExperience ?? 0),
    location: Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { latitude: lat, longitude: lng } : null,
    pinned: {
      area: String(structured?.area ?? "").trim(),
      district:
        districtFrom(String(structured?.formattedAddress ?? data.address ?? "")) || String(data.city ?? "").trim(),
    },
    details: (data.hotelDetails as HotelDetails | undefined) ?? {},
    verificationStatus: String(data.verificationStatus ?? "pending"),
    progress: progress?.nextStep
      ? {
          nextStep: String(progress.nextStep),
          completedSteps: asArray<string>(progress.completedSteps).map(String),
          rooms: Number(progress.rooms ?? 0),
        }
      : null,
  };
}

/**
 * Saves part of the property details. The API replaces `hotelDetails` as a whole, so
 * this merges the change into what is saved (like the app's draft) before sending.
 */
export async function saveHotelDetails(patch: HotelDetails, step?: "property" | "photos") {
  const current = await getLodgingProfile();
  const merged: HotelDetails = { ...current.details, ...patch };
  merged.images = [...new Set([...(merged.outlookImages ?? []), ...(merged.roomImages ?? []), ...(merged.restaurantImages ?? [])])];
  await customerPut("/providers/me", { hotelDetails: merged });
  if (step) await customerPost("/providers/me/onboarding/checkpoint", { step });
}

/** The owner's hotel listing (created by the API from the application). */
export async function getMyHotel(): Promise<{ id: string; name: string; approvalStatus: string; status: string } | null> {
  const list = asArray<Raw>(await customerGet("/hotels"));
  const hotel = list[0];
  if (!hotel) return null;
  return {
    id: idOf(hotel),
    name: String(hotel.name ?? ""),
    approvalStatus: String(hotel.approvalStatus ?? "pending"),
    status: String(hotel.status ?? "draft"),
  };
}

export type OwnerRoom = {
  id: string;
  name: string;
  roomType: RoomType;
  bedType: string;
  capacity: number;
  size: number;
  pricePerNight: number;
  totalRooms: number;
  amenities: string[];
  breakfastIncluded: boolean;
  cancellationPolicy: string;
  images: string[];
};

export type RoomInput = Omit<OwnerRoom, "id">;

function mapRoom(raw: Raw): OwnerRoom {
  return {
    id: idOf(raw),
    name: String(raw.name ?? ""),
    roomType: String(raw.roomType ?? "double") as RoomType,
    bedType: String(raw.bedType ?? ""),
    capacity: Number(raw.capacity ?? 2),
    size: Number(raw.size ?? 20),
    pricePerNight: Number(raw.pricePerNight ?? 0),
    totalRooms: Number(raw.totalRooms ?? 1),
    amenities: asArray<string>(raw.amenities).map(String),
    breakfastIncluded: Boolean(raw.breakfastIncluded),
    cancellationPolicy: String(raw.cancellationPolicy ?? ""),
    images: asArray<string>(raw.images).map(String),
  };
}

export async function listMyRooms(hotelId: string): Promise<OwnerRoom[]> {
  return asArray<Raw>(await customerGet(`/rooms/hotel/${encodeURIComponent(hotelId)}`)).map(mapRoom);
}

export async function createRoom(hotelId: string, input: RoomInput) {
  return mapRoom(await customerPost<Raw>("/rooms", { hotelId, ...input }));
}

export async function updateRoom(id: string, input: Partial<RoomInput>) {
  return mapRoom(await customerPut<Raw>(`/rooms/${encodeURIComponent(id)}`, input));
}

/** Hides a room type from travellers (existing bookings are kept). */
export async function removeRoom(id: string) {
  await customerDel(`/rooms/${encodeURIComponent(id)}`);
}

/** Sends the finished lodging application to BANJARA for review. */
export async function submitLodgingApplication() {
  await customerPost("/providers/me/onboarding/submit", {});
}

/* ------------------------------------------------------------------ */
/* Availability (calendar)                                             */
/* ------------------------------------------------------------------ */

export type NightAvailability = {
  date: string;
  totalRooms: number;
  bookedRooms: number;
  blockedRooms: number;
  availableRooms: number;
};

/** Nights that have bookings or closures. Nights not listed are fully open. */
export async function getRoomAvailability(roomId: string): Promise<NightAvailability[]> {
  return asArray<Raw>(await customerGet(`/availability/rooms/${encodeURIComponent(roomId)}`)).map((row) => ({
    date: String(row.date ?? ""),
    totalRooms: Number(row.totalRooms ?? 0),
    bookedRooms: Number(row.bookedRooms ?? 0),
    blockedRooms: Number(row.blockedRooms ?? 0),
    availableRooms: Number(row.availableRooms ?? 0),
  }));
}

/**
 * Closes rooms for the nights from `from` up to (not including) `to`, like a stay.
 * `count` defaults to every room of that type.
 */
export async function closeNights(roomId: string, from: string, to: string, count?: number) {
  await customerPost("/availability/bulk", { roomId, from, to, block: true, ...(count ? { blockCount: count } : {}) });
}

/** Reopens every closed room for those nights (bookings are never touched). */
export async function reopenNights(roomId: string, from: string, to: string) {
  await customerPost("/availability/bulk", { roomId, from, to, unblock: true });
}

/** Owner dashboard figures (`GET /providers/hotel/dashboard`). */
export type HotelDashboard = {
  rooms: number;
  availableRooms: number;
  todayBookings: number;
  checkInsToday: number;
  checkOutsToday: number;
  revenue: number;
  rating: number;
};

export async function getHotelDashboard(): Promise<HotelDashboard> {
  const d = await customerGet<Raw>("/providers/hotel/dashboard");
  return {
    rooms: Number(d.rooms ?? 0),
    availableRooms: Number(d.availableRooms ?? 0),
    todayBookings: Number(d.todayBookings ?? 0),
    checkInsToday: Number(d.checkInsToday ?? 0),
    checkOutsToday: Number(d.checkOutsToday ?? 0),
    revenue: Number(d.revenue ?? 0),
    rating: Number(d.rating ?? 0),
  };
}
