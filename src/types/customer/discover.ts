/** Mirror of the backend contract: banjara-backend/src/discover/types.ts (GET /api/discover). */
export type DiscoverService =
  | "transport"
  | "hotels"
  | "tours"
  | "guides"
  | "restaurants";
export type DiscoverSort = "recommended" | "price" | "rating" | "soonest";
export type DiscoverToggle = "topRated" | "verified" | "freeCancel" | "breakfast";

export type DiscoverLocation = {
  lat: number;
  lng: number;
  address: string;
  /** Deliberately blurred (guides): draw an area, not a pin. */
  approximate?: boolean;
};
export type DiscoverRoute = {
  from: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
};

export type DiscoverCard = {
  id: string;
  service: DiscoverService;
  title: string;
  subtitle: string;
  city: string;
  image: string | null;
  price: number | null;
  priceUnit: string | null;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  tags: string[];
  target: { type: "trip" | "hotel" | "provider"; id: string; providerId?: string };
  departsAt?: string;
  category?: string;
  location?: DiscoverLocation | null;
  route?: DiscoverRoute | null;
  offers?: { title: string; type: string; discountPercent: number }[];
  languages?: string[];
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
  /** Only with `near`: distance in km from the visitor to the pin. */
  distanceKm?: number;
};

export type DiscoverOptions = {
  sorts: { id: DiscoverSort; label: string }[];
  toggles: { id: DiscoverToggle; label: string }[];
  categories: { id: string; label: string }[];
};

export type DiscoverResult = {
  service: DiscoverService;
  total: number;
  items: DiscoverCard[];
  options: DiscoverOptions;
  applied: { order: DiscoverSort; only: DiscoverToggle[]; category: string | null };
  /** Map view: [[south, west], [north, east]] around the returned pins. */
  bounds: [[number, number], [number, number]] | null;
  /** The "near me" search the server applied (absent on older servers). */
  near?: { lat: number; lng: number; radiusKm: number } | null;
};

export type DiscoverParams = {
  service: DiscoverService;
  q?: string;
  city?: string;
  category?: string;
  order?: string;
  only?: string;
  limit?: number;
  /** "map" returns only listings with a location, plus bounds. */
  view?: "list" | "map";
  /** Viewport "west,south,east,north". */
  bbox?: string;
  /** "Near me": visitor position "lat,lng" and radius in km. */
  near?: string;
  radius?: number;
  from?: string;
  to?: string;
  date?: string;
  returnDate?: string;
  passengers?: number;
  journeyType?: string;
  bookingMode?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  rooms?: number;
};
