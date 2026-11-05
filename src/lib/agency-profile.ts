import type {
  AgencyTrip,
  AgencyVehicle,
  TransportAgency,
} from "../types/customer/agency";
type Raw = Record<string, unknown>;
const rec = (v: unknown): Raw =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const id = (v: unknown): string =>
  typeof v === "string" ? v : txt(rec(v).id || rec(v)._id);
const strings = (v: unknown) =>
  Array.isArray(v) ? v.map(txt).filter(Boolean) : [];
const uniq = (v: string[]) => [...new Set(v.filter(Boolean))];
const plateKey = (v: string) => v.replace(/[^a-z0-9]/gi, "").toUpperCase();
const positive = (v: unknown) =>
  Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined;
/** Public imagery is dynamic. Reject executable/data URLs rather than fabricating fleet photos. */
export function agencyImage(value: unknown) {
  try {
    const url = new URL(txt(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return /^\/(?!\/)/.test(txt(value)) ? txt(value) : "";
  }
}
export function mapTransportAgency(
  raw: Raw,
  allTrips: AgencyTrip[],
): TransportAgency {
  const providerId = id(raw),
    transport = rec(raw.transportDetails);
  const trips = allTrips.filter((t) => t.agencyId === providerId);
  const driverPhoto = agencyImage(transport.driverPhoto);
  const logo = agencyImage(raw.logo);
  const photos = (items: unknown[]) =>
    uniq(items.map(agencyImage)).filter((p) => p !== driverPhoto);
  const source = Array.isArray(raw.fleetVehicles)
    ? raw.fleetVehicles.map(rec)
    : [];
  const fleet: AgencyVehicle[] = source
    .filter((v) => id(v))
    .map((v) => {
      const plate = txt(v.registrationNumber);
      const trip = trips.find(
        (t) =>
          t.vehicleId === id(v) ||
          (plate && plateKey(t.vehiclePlate || "") === plateKey(plate)),
      );
      return {
        id: id(v),
        name: txt(v.name) || trip?.vehicleName || "Registered vehicle",
        kind: txt(v.type),
        plate,
        capacity: positive(trip?.vehicleCapacity),
        photos: photos([...strings(v.images), ...(trip?.vehicleImages || [])]),
        amenities: uniq(trip?.amenities || []),
      };
    });
  for (const trip of trips) {
    if (
      fleet.some(
        (v) =>
          v.id === trip.vehicleId ||
          (v.plate && plateKey(v.plate) === plateKey(trip.vehiclePlate || "")),
      )
    )
      continue;
    fleet.push({
      id: trip.vehicleId || trip.id,
      name: trip.vehicleName,
      kind: trip.vehicleClass || trip.vehicleType,
      plate: trip.vehiclePlate || "",
      capacity: positive(trip.vehicleCapacity),
      photos: photos(trip.vehicleImages || [trip.image]),
      amenities: uniq(trip.amenities),
    });
  }
  const plate = txt(transport.registrationNumber);
  const primaryPhotos = photos([
    transport.vehicleImageFront,
    transport.vehicleImageBack,
  ]);
  const primary = plate
    ? fleet.find((v) => plateKey(v.plate) === plateKey(plate))
    : undefined;
  if (primary) {
    primary.photos = uniq([...primaryPhotos, ...primary.photos]);
    // The driver's registered vehicle comes first.
    fleet.splice(fleet.indexOf(primary), 1);
    fleet.unshift(primary);
  } else if (plate || txt(transport.vehicleModel) || primaryPhotos.length)
    fleet.unshift({
      id: "registered-primary",
      name: txt(transport.vehicleModel) || "Registered vehicle",
      kind: txt(transport.vehicleClass),
      plate,
      photos: primaryPhotos,
      amenities: [],
    });
  return {
    id: providerId,
    userId: id(raw.userId),
    // Rides are offered by individual local drivers: show the driver, not a business.
    name:
      txt(transport.driverName) ||
      txt(raw.ownerName) ||
      txt(raw.businessName) ||
      txt(transport.businessName) ||
      "Local driver",
    description: txt(raw.description) || txt(transport.description),
    logo,
    phone: txt(raw.phone),
    city: txt(raw.city),
    address: txt(raw.address),
    verified: raw.verificationStatus === "approved",
    rating: positive(raw.rating) || 0,
    reviewCount: positive(raw.totalReviews) || 0,
    yearsExperience: positive(raw.yearsExperience),
    operatingCities: uniq(strings(transport.operatingCities)),
    operatingRoutes: uniq(strings(transport.operatingRoutes)),
    pickups: uniq(strings(transport.pickupLocations)),
    dropoffs: uniq(strings(transport.dropoffLocations)),
    // One driver, one vehicle. Older multi-vehicle accounts show their registered vehicle.
    fleet: fleet.slice(0, 1),
    driver: txt(transport.driverName)
      ? {
          name: txt(transport.driverName),
          experience: txt(transport.driverExperienceYears),
          photo: driverPhoto,
        }
      : undefined,
  };
}
/** Pakistan departure times must not depend on the visitor's browser timezone. */
export function agencyDepartureTime(trip: AgencyTrip) {
  return Date.parse(
    `${trip.date.slice(0, 10)}T${/^\d{2}:\d{2}/.test(trip.departureTime) ? trip.departureTime.slice(0, 5) : "invalid"}:00+05:00`,
  );
}
export function agencyDepartures(trips: AgencyTrip[], now = Date.now()) {
  return trips
    .filter(
      (t) =>
        ![
          "cancelled",
          "canceled",
          "completed",
          "departed",
          "expired",
          "suspended",
          "rejected",
          "inactive",
          "draft",
        ].includes((t.status || "").toLowerCase()) &&
        Number.isFinite(t.availableSeats) &&
        t.availableSeats > 0 &&
        Number.isFinite(t.price) &&
        t.price >= 0 &&
        agencyDepartureTime(t) >= now,
    )
    .sort((a, b) => agencyDepartureTime(a) - agencyDepartureTime(b));
}
export function agencyRouteKey(trip: Pick<AgencyTrip, "from" | "to">) {
  return JSON.stringify([trip.from, trip.to]);
}
export function filterAgencyDepartures(
  trips: AgencyTrip[],
  route: string,
  date: string,
  now = Date.now(),
) {
  return agencyDepartures(trips, now).filter(
    (t) =>
      (!route || agencyRouteKey(t) === route) &&
      (!date || t.date.slice(0, 10) === date),
  );
}
