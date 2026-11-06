import { CustomerApiError, customerGet, customerPost, customerPut } from "@/lib/customer-api";

/** The five services a BANJARA provider can offer (one per account). */
export type ProviderServiceKey = "transport" | "hotel" | "tour" | "travelGuide" | "restaurant";

export const PROVIDER_SERVICE_KEYS: ProviderServiceKey[] = [
  "transport",
  "hotel",
  "tour",
  "travelGuide",
  "restaurant",
];

/** Same `providerType` the mobile app sends for each service. */
const PROVIDER_TYPE: Record<ProviderServiceKey, string> = {
  transport: "vanOperator",
  hotel: "hotel",
  tour: "tourOperator",
  travelGuide: "travelGuide",
  restaurant: "restaurant",
};

/** Which services the admin has switched on, in their display order. */
export async function listActiveProviderServices(): Promise<ProviderServiceKey[]> {
  try {
    const data = await customerGet<unknown>("/services");
    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    const active = rows
      .filter((row) => row.active !== false)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .map((row) => String(row.key ?? ""))
      .filter((key): key is ProviderServiceKey =>
        (PROVIDER_SERVICE_KEYS as string[]).includes(key),
      );
    return active.length ? active : PROVIDER_SERVICE_KEYS;
  } catch {
    return PROVIDER_SERVICE_KEYS;
  }
}

export type ProviderApplicationDetails = {
  service: ProviderServiceKey;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  city: string;
  address: string;
  yearsExperience: number;
};

/**
 * Starts the provider application with the chosen service and basic details,
 * exactly like the mobile app's first save. The app picks up from here
 * (location pin, service details, photos, CNIC check, review).
 */
export async function startProviderApplication(details: ProviderApplicationDetails) {
  const payload = {
    businessName: details.businessName.trim(),
    ownerName: details.ownerName.trim(),
    providerType: [PROVIDER_TYPE[details.service]],
    services: [details.service],
    description: details.description.trim(),
    phone: details.phone.trim(),
    email: details.email.trim().toLowerCase(),
    city: details.city.trim(),
    address: details.address.trim(),
    yearsExperience: details.yearsExperience,
  };
  try {
    return await customerPost<Record<string, unknown>>("/providers/register", payload);
  } catch (error) {
    // Already started (for example in the app): update it instead.
    if (error instanceof CustomerApiError && error.status === 409) {
      return customerPut<Record<string, unknown>>("/providers/me", payload);
    }
    throw error;
  }
}

/**
 * Edits step 3 from the review page. City and address are left alone: they come
 * from the map pin (step 4), which has its own edit link.
 */
export async function updateDriverDetails(details: {
  /** Defaults to the owner’s name (drivers and guides list under their own name). */
  businessName?: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  yearsExperience: number;
}) {
  return customerPut<Record<string, unknown>>("/providers/me", {
    businessName: (details.businessName || details.ownerName).trim(),
    ownerName: details.ownerName.trim(),
    phone: details.phone.trim(),
    email: details.email.trim().toLowerCase(),
    description: details.description.trim(),
    yearsExperience: details.yearsExperience,
  });
}

/* ------------------------------------------------------------------ */
/* Location (driver step 4)                                            */
/* ------------------------------------------------------------------ */

export type StructuredAddress = {
  street?: string;
  area?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string;
};

export type PlaceResult = {
  name: string;
  address: StructuredAddress;
  latitude: number;
  longitude: number;
};

function toPlace(raw: Record<string, unknown>): PlaceResult | null {
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name: String(raw.name ?? ""),
    address: (raw.address ?? {}) as StructuredAddress,
    latitude,
    longitude,
  };
}

/** Place search used by the app's location picker (Pakistan only). */
export async function searchPlaces(query: string, limit = 6): Promise<PlaceResult[]> {
  const data = await customerGet<unknown>("/businesses/search", { params: { q: query, limit } });
  return (Array.isArray(data) ? data : [])
    .map((row) => toPlace(row as Record<string, unknown>))
    .filter((place): place is PlaceResult => Boolean(place));
}

/** Address for a point on the map. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<PlaceResult | null> {
  const data = await customerGet<Record<string, unknown>>("/businesses/reverse", {
    params: { latitude, longitude },
  });
  // Keep the driver's exact pin; the geocoder may snap to a nearby feature.
  return toPlace({ ...data, latitude, longitude });
}

/**
 * Saves the driver's pin and confirms the location step, exactly like the
 * mobile app: update the profile, then record the `location` checkpoint.
 */
export async function saveDriverLocation(input: {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  structured: StructuredAddress;
}) {
  await customerPut("/providers/me", {
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address.trim(),
    city: input.city.trim(),
    structuredAddress: {
      ...input.structured,
      city: input.city.trim(),
      formattedAddress: input.address.trim(),
      country: input.structured.country || "Pakistan",
    },
  });
  await customerPost("/providers/me/onboarding/checkpoint", { step: "location" });
}

/* ------------------------------------------------------------------ */
/* You & your vehicle (driver step 5)                                  */
/* ------------------------------------------------------------------ */

export type VehicleClass = "car" | "jeep" | "suv" | "van" | "mini_bus" | "bus";
export type PricingMethod = "per_seat" | "per_vehicle" | "negotiable";

/** Same fields the app's "Driver registration" screen saves as `transportDetails`. */
export type DriverVehicleDetails = {
  vehicleClass: VehicleClass;
  vehicleModel: string;
  vehicleMakeYear: string;
  registrationNumber: string;
  engineNumber: string;
  ownerName: string;
  driverName: string;
  driverPhone: string;
  driverEmail?: string;
  driverCnic: string;
  driverLicenseNumber: string;
  driverPermanentAddress: string;
  driverEmergencyContact: string;
  driverExperienceYears: string;
  hasInsurance: "yes";
  insuranceCompany: string;
  insuranceNumber: string;
  insuranceYear: string;
  vehicleImageFront: string;
  vehicleImageBack: string;
  driverPhoto?: string;
  operatingCities: string[];
  operatingRoutes: string[];
  description?: string;
  pricingMethod: PricingMethod;
  priceAmount?: number;
  pricePercent?: number;
};

/** The driver's profile and whatever vehicle details they already saved (web or app). */
export async function getMyDriverProfile() {
  const data = await customerGet<Record<string, unknown>>("/providers/me");
  return {
    ownerName: String(data.ownerName ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    yearsExperience: Number(data.yearsExperience ?? 0),
    city: String(data.city ?? ""),
    description: String(data.description ?? ""),
    transport: (data.transportDetails ?? {}) as Partial<DriverVehicleDetails> & Record<string, unknown>,
  };
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadFolder = "vehicles" | "hotels" | "rooms";

/** Uploads one photo the way the app does (`POST /uploads`). */
export async function uploadVehiclePhoto(
  file: File,
  onProgress?: (percent: number) => void,
  folder: UploadFolder = "vehicles",
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or WebP).");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("This photo is larger than 5 MB. Choose a smaller one.");
  const form = new FormData();
  form.append("folder", folder);
  form.append("file", file, file.name);
  const result = await customerPost<{ url?: string }>("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });
  if (!result?.url) throw new Error("The photo didn’t upload. Please try again.");
  return result.url;
}

/**
 * Saves the driver's vehicle and personal details, then confirms the step.
 * The backend checks everything again and creates the vehicle record.
 */
export async function saveDriverVehicle(details: DriverVehicleDetails) {
  const transportDetails = {
    ...details,
    // One local driver, one vehicle they own: the driver's name is the listing.
    businessName: details.driverName.trim(),
    vehicleTypes: [details.vehicleClass],
    vehicleCount: 1,
    ownershipType: "owned",
  };
  await customerPut("/providers/me", { transportDetails });
  await customerPost("/providers/me/onboarding/checkpoint", { step: "transport" });
}

/* ------------------------------------------------------------------ */
/* Vehicle setup (driver step 6)                                       */
/* ------------------------------------------------------------------ */

/** Amenity labels the app saves, so both show the same thing. */
export const VEHICLE_AMENITIES = ["Air Conditioning", "WiFi", "Charging Ports", "Luggage Space"] as const;

export type DriverVehicleRecord = {
  id: string;
  name: string;
  vehicleModel: string;
  year: string;
  registrationNumber: string;
  seatCount?: number;
  amenities: string[];
  images: string[];
  status: string;
  /** Set once the vehicle passed the backend's full registration check. */
  registrationCompleted: boolean;
};

/**
 * The vehicle created from step 5 (matched by registration number, like the
 * app), plus the step-5 details the backend checks the vehicle against.
 */
export async function getDriverVehicleSetup() {
  const [profile, vehicles] = await Promise.all([
    customerGet<Record<string, unknown>>("/providers/me"),
    customerGet<unknown>("/vehicles"),
  ]);
  const details = (profile.transportDetails ?? {}) as Record<string, unknown>;
  const plate = String(details.registrationNumber ?? "").trim().toUpperCase();
  const rows = (Array.isArray(vehicles) ? vehicles : []) as Array<Record<string, unknown>>;
  const raw =
    rows.find((row) => String(row.registrationNumber ?? "").trim().toUpperCase() === plate) ??
    rows.find((row) => row.status !== "rejected");
  const vehicle: DriverVehicleRecord | null = raw
    ? {
        id: String(raw._id ?? raw.id ?? ""),
        name: String(raw.name ?? ""),
        vehicleModel: String(raw.vehicleModel ?? ""),
        year: String(raw.year ?? ""),
        registrationNumber: String(raw.registrationNumber ?? ""),
        seatCount: Number(raw.seatCount) || undefined,
        amenities: Array.isArray(raw.amenities) ? raw.amenities.map(String) : [],
        images: Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean) : [],
        status: String(raw.status ?? "pending"),
        registrationCompleted: Boolean(raw.registrationCompletedAt),
      }
    : null;
  return { details, vehicle };
}

/**
 * Completes the driver's vehicle (name, seats, amenities, photos), then confirms
 * the step. The backend re-checks it against the step-5 registration details.
 */
export async function saveVehicleSetup(input: {
  vehicleId: string;
  details: Record<string, unknown>;
  name: string;
  seatCount: number;
  amenities: string[];
  front: string;
  back: string;
  extraPhotos: string[];
}) {
  const verificationDetails = {
    ...input.details,
    vehicleImageFront: input.front,
    vehicleImageBack: input.back,
  };
  await customerPut(`/vehicles/${input.vehicleId}`, {
    name: input.name.trim(),
    verificationDetails,
    vehicleModel: String(input.details.vehicleModel ?? ""),
    year: Number(input.details.vehicleMakeYear),
    registrationNumber: String(input.details.registrationNumber ?? ""),
    seatCount: input.seatCount,
    amenities: input.amenities,
    // Front and back first: the backend requires both in the gallery.
    images: [input.front, input.back, ...input.extraPhotos].filter(Boolean),
  });
  await customerPost("/providers/me/onboarding/checkpoint", {
    step: "vehicle",
    vehicleId: input.vehicleId,
  });
}

/* ------------------------------------------------------------------ */
/* Review & submit (driver step 8)                                     */
/* ------------------------------------------------------------------ */

/** Everything the driver entered, gathered for the review page. */
export async function getDriverReview() {
  const [profile, setup] = await Promise.all([
    customerGet<Record<string, unknown>>("/providers/me"),
    getDriverVehicleSetup(),
  ]);
  const identity = (profile.identityVerification ?? {}) as Record<string, unknown>;
  const structured = (profile.structuredAddress ?? {}) as Record<string, unknown>;
  const coords = (profile.location as { coordinates?: unknown } | undefined)?.coordinates;
  const [lng, lat] = Array.isArray(coords) ? coords.map(Number) : [];
  const progress = (profile.onboardingProgress ?? {}) as Record<string, unknown>;
  return {
    ownerName: String(profile.ownerName ?? ""),
    phone: String(profile.phone ?? ""),
    email: String(profile.email ?? ""),
    description: String(profile.description ?? ""),
    yearsExperience: Number(profile.yearsExperience ?? 0),
    city: String(profile.city ?? ""),
    address: String(structured.formattedAddress ?? profile.address ?? ""),
    pin: Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null,
    transport: setup.details,
    vehicle: setup.vehicle,
    cnicVerified:
      identity.verificationStatus === "verified" && identity.cnicVerified === true,
    nextStep: String(progress.nextStep ?? ""),
    submittedAt: progress.submittedAt ? String(progress.submittedAt) : null,
  };
}

/** Sends the finished application to BANJARA for review. */
export async function submitDriverApplication() {
  await customerPost("/providers/me/onboarding/submit", {});
}

/* ------------------------------------------------------------------ */
/* CNIC verification (driver step 7)                                   */
/* ------------------------------------------------------------------ */

export type CnicCheckStatus = "verified" | "failed" | "manual_review";

export type CnicCheckResult = {
  status: CnicCheckStatus;
  message: string;
  fields: {
    cnicNumber: { matched: boolean };
    fatherName: { matched: boolean };
    expiryDate: { matched: boolean; expired?: boolean };
  };
};

/** The driver's saved CNIC check, or null if they haven't tried yet. */
export async function getCnicStatus(): Promise<{
  status: CnicCheckStatus | null;
  verified: boolean;
  cnicMasked?: string;
  reason?: string | null;
} | null> {
  const data = await customerGet<Record<string, unknown> | null>("/verification/cnic");
  if (!data) return null;
  const status = (data.verificationStatus as CnicCheckStatus | undefined) ?? null;
  return {
    status,
    verified: status === "verified" && data.cnicVerified === true,
    cnicMasked: data.cnicNumberMasked ? String(data.cnicNumberMasked) : undefined,
    reason: (data.verificationFailureReason as string | null | undefined) ?? null,
  };
}

/**
 * Runs the backend's CNIC check (the same one the app uses): it reads the card
 * photos, matches them with the typed details and saves only the result —
 * the photos themselves are not stored.
 */
export async function verifyDriverCnic(input: {
  front: File;
  back: File;
  cnicNumber: string;
  fatherName: string;
  expiryDate: string;
}): Promise<CnicCheckResult> {
  const form = new FormData();
  form.append("cnicNumber", input.cnicNumber);
  form.append("fatherName", input.fatherName.trim());
  form.append("expiryDate", input.expiryDate);
  form.append("front", input.front, input.front.name);
  form.append("back", input.back, input.back.name);
  const data = await customerPost<Record<string, unknown>>("/verification/cnic", form, {
    headers: { "Content-Type": "multipart/form-data" },
    // Reading the card can take a while.
    timeout: 120_000,
  });
  const fields = (data.fields ?? {}) as Record<string, { matched?: boolean; expired?: boolean }>;
  return {
    status: (data.status as CnicCheckStatus) ?? "failed",
    message: String(data.message ?? ""),
    fields: {
      cnicNumber: { matched: Boolean(fields.cnicNumber?.matched) },
      fatherName: { matched: Boolean(fields.fatherName?.matched) },
      expiryDate: { matched: Boolean(fields.expiryDate?.matched), expired: Boolean(fields.expiryDate?.expired) },
    },
  };
}
