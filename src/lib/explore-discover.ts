import { readCatalogFilters } from "@/lib/explore-catalog";
import { readExploreFilters } from "@/lib/explore-destinations";
import { readExploreSearch } from "@/lib/explore-search";
import type { DiscoverParams } from "@/types/customer/discover";

/** URL parameter that holds each service's sub-type selection. */
export const CATEGORY_KEY = {
  transport: "vehicle",
  hotels: "residence",
  tours: "tourType",
  guides: "gender",
} as const;

/**
 * Turns the Explore URL into a GET /api/discover query. The list page and the map page both
 * call this, so a filter chosen on one is applied identically on the other.
 */
export function discoverParamsFromUrl(params: URLSearchParams) {
  const catalogFilters = readCatalogFilters(params);
  const filters = readExploreFilters(params);
  const search = readExploreSearch(params);
  const service = catalogFilters.service;
  const wantedCategory =
    service in CATEGORY_KEY
      ? String(catalogFilters[CATEGORY_KEY[service as keyof typeof CATEGORY_KEY]])
      : "";
  const trips = service === "transport";
  const stays = service === "hotels";
  const base: DiscoverParams = {
    service,
    q: filters.query || undefined,
    city:
      service === "restaurants"
        ? catalogFilters.city || undefined
        : stays
          ? search.hotel.destination || undefined
          : undefined,
    order: params.get("order") ?? undefined,
    only: params.get("only") ?? undefined,
    ...(trips
      ? {
          from: search.trip.from || undefined,
          to: search.trip.to || undefined,
          date: search.trip.date || undefined,
          returnDate: search.returnDate || undefined,
          passengers: params.has("passengers") ? search.trip.passengers : undefined,
          journeyType: search.trip.journeyType,
          bookingMode: search.bookingMode || undefined,
        }
      : {}),
    ...(stays
      ? {
          checkIn: search.hotel.checkIn || undefined,
          checkOut: search.hotel.checkOut || undefined,
          adults: params.has("adults") ? search.hotel.adults : undefined,
          children: params.has("children") ? search.hotel.children : undefined,
          rooms: params.has("rooms") ? search.hotel.rooms : undefined,
        }
      : {}),
  };
  return {
    catalogFilters,
    filters,
    base,
    category: wantedCategory && wantedCategory !== "all" ? wantedCategory : undefined,
  };
}

/** Where a listing's details live. Rides open the agency, everything else its own page. */
export function listingHref(
  card: {
    id: string;
    service: string;
    target: { providerId?: string; id: string };
  },
  stayParams?: URLSearchParams,
): string {
  if (card.service === "transport") {
    return card.target.providerId
      ? `/agencies/${encodeURIComponent(card.target.providerId)}`
      : `/trips/${encodeURIComponent(card.target.id)}`;
  }
  if (card.service === "hotels") {
    return `/hotels/${card.id}${stayParams && stayParams.size ? `?${stayParams}` : ""}`;
  }
  return `/${card.service}/${card.id}`;
}
