import type { DiscoverCard } from "@/types/customer/discover";

/**
 * Explore filters that live in the URL. Most are applied by GET /api/discover (see
 * explore-discover.ts); the ones the API has no parameter for — price range, minimum rating,
 * "price high→low" / "top rated" sorting and "search this area" — are applied here, in the
 * browser, to the cards the API returned.
 */
export const EXPLORE_SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "price", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
  { id: "soonest", label: "Soonest departure", transportOnly: true },
] as const;
export type ExploreSort = (typeof EXPLORE_SORTS)[number]["id"];

export const SEAT_OPTIONS = [2, 4, 7, 12] as const;
export const RATING_OPTIONS = [4, 4.5] as const;
export const PICKUP_CITIES = ["Islamabad", "Rawalpindi", "Gilgit", "Hunza", "Skardu", "Chilas", "Naran"] as const;
export const DESTINATION_CITIES = ["Hunza", "Skardu", "Gilgit", "Fairy Meadows", "Naran", "Khunjerab", "Swat", "Chitral"] as const;

/** Upper end of the price slider (PKR). Prices above it are still matched when no max is set. */
export const PRICE_CEILING = 100_000;
export const PRICE_STEP = 500;

export type ExploreBox = { west: number; south: number; east: number; north: number };

export type ExploreRefine = {
  order: ExploreSort;
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  seats: number | null;
  bookingMode: "seat" | "vehicle" | null;
  journeyType: "one_way" | "round_trip" | null;
  from: string;
  to: string;
  date: string;
  verified: boolean;
  view: "vehicles" | "drivers";
  bbox: ExploreBox | null;
};

const positive = (value: string | null) => {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export function parseBox(value: string | null): ExploreBox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) return null;
  return { west, south, east, north };
}

export function formatBox(box: ExploreBox) {
  return [box.west, box.south, box.east, box.north].map((n) => n.toFixed(4)).join(",");
}

export function readExploreRefine(params: URLSearchParams): ExploreRefine {
  const order = EXPLORE_SORTS.find((s) => s.id === params.get("order"))?.id ?? "recommended";
  let minPrice = positive(params.get("minPrice"));
  let maxPrice = positive(params.get("maxPrice"));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const rating = Number(params.get("rating"));
  const seats = Number(params.get("passengers"));
  const mode = params.get("bookingMode");
  const journey = params.get("journeyType");
  const text = (key: string) => (params.get(key) ?? "").trim().slice(0, 100);
  return {
    order,
    minPrice: minPrice || null,
    maxPrice,
    rating: (RATING_OPTIONS as readonly number[]).includes(rating) ? rating : null,
    seats: Number.isInteger(seats) && seats > 1 ? Math.min(seats, 100) : null,
    bookingMode: mode === "seat" || mode === "vehicle" ? mode : null,
    journeyType: journey === "one_way" || journey === "round_trip" ? journey : null,
    from: text("from"),
    to: text("to"),
    date: /^\d{4}-\d{2}-\d{2}$/.test(text("date")) ? text("date") : "",
    verified: (params.get("only") ?? "").split(",").includes("verified"),
    view: params.get("view") === "drivers" ? "drivers" : "vehicles",
    bbox: parseBox(params.get("bbox")),
  };
}

const num = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The browser-side part of the filters: price range, rating, map area and the extra sorts. */
export function refineCards(cards: DiscoverCard[], refine: ExploreRefine): DiscoverCard[] {
  const { minPrice, maxPrice, rating, bbox } = refine;
  const out = cards.filter((card) => {
    const price = num(card.price);
    if ((minPrice !== null || maxPrice !== null) && (price === null || price <= 0)) return false;
    if (minPrice !== null && price !== null && price < minPrice) return false;
    if (maxPrice !== null && price !== null && price > maxPrice) return false;
    if (rating !== null && (num(card.rating) ?? 0) < rating) return false;
    if (bbox) {
      const at = card.location;
      if (!at || at.lng < bbox.west || at.lng > bbox.east || at.lat < bbox.south || at.lat > bbox.north) return false;
    }
    return true;
  });
  const priced = (card: DiscoverCard, missing: number) => num(card.price) || missing;
  // Array#sort is stable, so ties keep the API's "recommended" order.
  if (refine.order === "price") out.sort((a, b) => priced(a, Infinity) - priced(b, Infinity));
  else if (refine.order === "price_desc") out.sort((a, b) => priced(b, -1) - priced(a, -1));
  else if (refine.order === "rating") out.sort((a, b) => (num(b.rating) ?? 0) - (num(a.rating) ?? 0));
  return out;
}

export type ActiveFilter = { key: string; label: string; clear: Record<string, string | null> };

const pkr = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

/** Removable chips for everything the visitor has narrowed by (not sort or tab choices). */
export function activeFilters(
  refine: ExploreRefine,
  extra: { query: string; vehicleLabel?: string | null; only?: string[] },
): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  if (extra.query) chips.push({ key: "q", label: `“${extra.query}”`, clear: { q: null } });
  if (extra.vehicleLabel) chips.push({ key: "vehicle", label: extra.vehicleLabel, clear: { vehicle: null } });
  if (refine.minPrice !== null || refine.maxPrice !== null) {
    const label =
      refine.minPrice !== null && refine.maxPrice !== null
        ? `${pkr(refine.minPrice)} – ${pkr(refine.maxPrice)}`
        : refine.minPrice !== null
          ? `From ${pkr(refine.minPrice)}`
          : `Up to ${pkr(refine.maxPrice!)}`;
    chips.push({ key: "price", label, clear: { minPrice: null, maxPrice: null } });
  }
  if (refine.seats) chips.push({ key: "seats", label: `${refine.seats}+ seats`, clear: { passengers: null } });
  if (refine.bookingMode)
    chips.push({
      key: "bookingMode",
      label: refine.bookingMode === "vehicle" ? "Whole vehicle" : "Per seat",
      clear: { bookingMode: null },
    });
  if (refine.journeyType)
    chips.push({
      key: "journeyType",
      label: refine.journeyType === "round_trip" ? "Round trip" : "One way",
      clear: { journeyType: null },
    });
  if (refine.from) chips.push({ key: "from", label: `From ${refine.from}`, clear: { from: null } });
  if (refine.to) chips.push({ key: "to", label: `To ${refine.to}`, clear: { to: null } });
  if (refine.date) chips.push({ key: "date", label: refine.date, clear: { date: null } });
  if (refine.rating) chips.push({ key: "rating", label: `${refine.rating}★ & up`, clear: { rating: null } });
  if (refine.verified) {
    const rest = (extra.only ?? []).filter((id) => id && id !== "verified");
    chips.push({ key: "verified", label: "Verified only", clear: { only: rest.length ? rest.join(",") : null } });
  }
  if (refine.bbox) chips.push({ key: "bbox", label: "Map area", clear: { bbox: null } });
  return chips;
}

/** Every URL key the filter UI owns; "Clear all" removes these and keeps the service tab. */
export const FILTER_KEYS = [
  "q",
  "vehicle",
  "minPrice",
  "maxPrice",
  "passengers",
  "bookingMode",
  "journeyType",
  "from",
  "to",
  "date",
  "returnDate",
  "rating",
  "only",
  "bbox",
  "order",
] as const;
