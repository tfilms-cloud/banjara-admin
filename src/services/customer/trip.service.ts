import { customerGet } from "@/lib/customer-api";
import { mapTrip, type AnyRecord } from "@/lib/customer-mappers";
import { serverGet } from "@/lib/server-api";
import { asArray } from "@/lib/utils";
import type { TripSearchParams, TripSortBy, TripWithDetails } from "@/types/customer/trip";

function sortToBackend(sortBy: TripSortBy): string {
  switch (sortBy) {
    case "price_asc":
      return "priceLowToHigh";
    case "price_desc":
      return "priceHighToLow";
    case "departure":
      return "departureTime";
    case "recommended":
      return "recommended";
    default:
      return "recommended";
  }
}

function sortTrips(results: TripWithDetails[], sortBy: TripSortBy) {
  return [...results].sort((a, b) => {
    switch (sortBy) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      case "duration":
        return a.durationMinutes - b.durationMinutes;
      case "recommended":
        return Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) || b.rating - a.rating;
      case "departure":
      default:
        return a.departureTime.localeCompare(b.departureTime);
    }
  });
}

export async function searchTrips(
  params: TripSearchParams,
  sortBy: TripSortBy = "departure"
): Promise<TripWithDetails[]> {
  const query = params.query?.trim();
  const searchParams = {
    origin: query ? undefined : params.from || undefined,
    destination: query ? undefined : params.to || undefined,
    date: query ? undefined : params.date || undefined,
    passengers: params.passengers,
    journeyType: params.journeyType,
    sort: sortToBackend(sortBy),
  };

  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>("/trips/search", searchParams)
      : await customerGet<unknown>("/trips/search", { params: searchParams });

  let results = asArray<AnyRecord>(data).map(mapTrip);
  results = results.filter((trip) => trip.availableSeats >= params.passengers);
  return sortTrips(results, sortBy);
}

export async function getTripById(id: string): Promise<TripWithDetails | null> {
  if (!id) return null;
  try {
    const data =
      typeof window === "undefined"
        ? await serverGet<AnyRecord>(`/trips/${id}`)
        : await customerGet<AnyRecord>(`/trips/${id}`);
    return mapTrip(data);
  } catch {
    return null;
  }
}

export async function getRecommendedTrips(limit = 12): Promise<TripWithDetails[]> {
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>("/trips/search", { sort: "recommended", limit })
      : await customerGet<unknown>("/trips/search", {
          params: { sort: "recommended", limit },
        });
  return asArray<AnyRecord>(data).map(mapTrip);
}
