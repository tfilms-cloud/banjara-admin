import type { TripWithDetails } from "@/types/customer/trip";

// Keep these choices aligned with the mobile Explore catalog/provider registration.
export const EXPLORE_SERVICES = [
  { id: "transport", label: "Ride", title: "Transportation" },
  { id: "hotels", label: "Stay", title: "Lodging" },
  { id: "tours", label: "Tours", title: "Tour Operators" },
  { id: "guides", label: "Guides", title: "Guides" },
  { id: "restaurants", label: "Restaurants", title: "Restaurants" },
] as const;
export const VEHICLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "car", label: "Car" },
  { id: "jeep", label: "Jeep" },
  { id: "suv", label: "SUV" },
  { id: "van", label: "Van" },
  { id: "mini_bus", label: "Mini bus" },
  { id: "bus", label: "Bus" },
  { id: "other", label: "Other" },
] as const;
export const RESIDENCE_FILTERS = [
  { id: "hotel", label: "Hotels" },
  { id: "guest_house", label: "Guest houses" },
  { id: "lodge", label: "Hostels & lodges" },
] as const;
export const TOUR_FILTERS = [
  { id: "trek", label: "Trek" },
  { id: "expedition", label: "Expedition" },
  { id: "summit", label: "Summits" },
] as const;
export const GENDER_FILTERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
] as const;
export type ExploreService = (typeof EXPLORE_SERVICES)[number]["id"];
export function readCatalogFilters(params: URLSearchParams) {
  const choice = <T extends string>(
    key: string,
    options: readonly { id: T }[],
    fallback: T,
  ): T =>
    options.find((option) => option.id === params.get(key))?.id ?? fallback;
  return {
    service: choice("service", EXPLORE_SERVICES, "transport"),
    vehicle: choice("vehicle", VEHICLE_FILTERS, "all"),
    residence: choice("residence", RESIDENCE_FILTERS, "hotel"),
    tourType: choice("tourType", TOUR_FILTERS, "trek"),
    gender: choice("gender", GENDER_FILTERS, "male"),
    city: (params.get("city") ?? "").trim().slice(0, 100),
  };
}
export type CatalogFilters = ReturnType<typeof readCatalogFilters>;
export function exploreVehicleClass(trip: TripWithDetails) {
  const category = (
    trip.vehicleCategory ||
    trip.vehicleClass ||
    trip.vehicleType ||
    ""
  )
    .trim()
    .toLowerCase();
  if (category === "minibus" || category === "mini-bus") return "mini_bus";
  if (category === "private") return "car";
  return (
    VEHICLE_FILTERS.find(
      (option) => option.id !== "all" && option.id === category,
    )?.id ?? "other"
  );
}
export function exploreVehicleOptions(trips: TripWithDetails[]) {
  const present = new Set(trips.map(exploreVehicleClass));
  return VEHICLE_FILTERS.filter(
    (option) => option.id === "all" || present.has(option.id),
  );
}
export function exploreVehicles(trips: TripWithDetails[], filter: string) {
  const vehicles = new Map<string, TripWithDetails>();
  for (const trip of trips) {
    if (filter !== "all" && exploreVehicleClass(trip) !== filter) continue;
    const key = `${trip.agencyId}-${trip.vehicleId || trip.vehicleName || trip.vehicleType}`;
    const previous = vehicles.get(key);
    if (!previous || trip.price < previous.price) vehicles.set(key, trip);
  }
  return [...vehicles.values()];
}
export function residenceClass(type: string) {
  const value = type.toLowerCase();
  return value.includes("guest")
    ? "guest_house"
    : /lodge|hostel|home/.test(value)
      ? "lodge"
      : "hotel";
}
export function catalogMatches(
  query: string,
  ...parts: (string | undefined)[]
) {
  return parts.join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
