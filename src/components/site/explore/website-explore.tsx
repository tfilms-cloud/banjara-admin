"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@/lib/live-query";
import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpDown,
  ArrowUpNarrowWide,
  Mountain,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ChipDropdown } from "./chip-dropdown";
import { HomeDialog, HomeImage } from "@/components/site/home/home-primitives";
import { useSavedDestinations } from "@/hooks/use-saved-destinations";
import {
  EXPLORE_DESTINATIONS,
  EXPLORE_REGIONS,
  destinationMatches,
  destinationInventory,
  filterDestinations,
  readExploreFilters,
  type ExploreDestination,
} from "@/lib/explore-destinations";
import {
  bookableTrips,
  pakistanDate,
  rideSearchHref,
  vehicleCategory,
} from "@/lib/home-discovery";
import { addDaysIso } from "@/lib/customer-destinations";
import { getRecommendedTrips, searchTrips } from "@/services/customer/trip.service";
import { getPopularHotels, searchHotels } from "@/services/customer/hotel.service";
import { readExploreSearch, matchesExploreJourney } from "@/lib/explore-search";
import {
  getDiscoveryListings,
  type DiscoveryListing,
} from "@/services/customer/discovery.service";
import type { TripWithDetails } from "@/types/customer/trip";
import type { Hotel } from "@/types/customer/hotel";
import { DestinationCard } from "./destination-card";
import { getDiscover } from "@/services/customer/discover.service";
import { CATEGORY_KEY, discoverParamsFromUrl, listingHref } from "@/lib/explore-discover";
import { readCatalogFilters, type ExploreService } from "@/lib/explore-catalog";
import { FILTER_KEYS, readExploreRefine, refineCards } from "@/lib/explore-refine";
import { ExploreFilterBar } from "./explore-filter-bar";
import { ExploreResults, ExploreSectionHeader } from "./explore-results";
import { ServicePicker } from "./service-picker";
import styles from "./explore.module.css";
import layout from "./explore-layout.module.css";

type Modal =
  | { kind: "destination"; place: ExploreDestination }
  | { kind: "listing"; listing: DiscoveryListing }
  | { kind: "filters" }
  | { kind: "roads" };
type Props = {
  initialTrips?: TripWithDetails[];
  initialHotels?: Hotel[];
  initialGuides?: DiscoveryListing[];
  initialTours?: DiscoveryListing[];
};
const ROAD_PLANS = [
  {
    label: "ALT. 4,173 m",
    title: "Babusar Pass",
    body: "Confirm seasonal opening, departure time, and the planned route with your provider before traveling.",
    note: "Ask about the KKH alternative",
  },
  {
    label: "N-35 ARTERY",
    title: "KKH Lower Corridor",
    body: "Confirm your pickup point, road access, and journey duration before setting out along the Karakoram Highway.",
    note: "Check your operator’s route",
  },
  {
    label: "DIR–CHITRAL LINK",
    title: "Lowari Tunnel",
    body: "Check the latest tunnel access and any travel restrictions with your operator before departure.",
    note: "Confirm local access guidance",
  },
  {
    label: "ALT. 4,114 m",
    title: "Deosai High Plateau",
    body: "Discuss seasonal access, weather preparation, and a suitable high-clearance vehicle with your local provider.",
    note: "Plan a suitable mountain vehicle",
  },
];
/** URL keys that only shape the listings; switching category or clearing drops them. */
const LISTING_KEYS = [
  ...FILTER_KEYS,
  ...Object.values(CATEGORY_KEY),
  "view",
  "city",
  "destination",
  "checkIn",
  "checkOut",
  "adults",
  "children",
  "rooms",
];

export function WebsiteExplore({
  initialTrips,
  initialHotels,
  initialGuides,
  initialTours,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filters = readExploreFilters(params);
  const refine = readExploreRefine(params);
  const [modal, setModal] = useState<Modal | null>(null);
  const catalogFilters = readCatalogFilters(params);
  const service = catalogFilters.service;
  const searchConstraints = readExploreSearch(params);
  const favorites = useSavedDestinations();
  const tripQuery = useQuery({
    queryKey: ["customer", "explore", "trips", searchConstraints.trip],
    queryFn: () => searchConstraints.hasTripSearch ? searchTrips(searchConstraints.trip) : getRecommendedTrips(100),
    initialData: searchConstraints.hasTripSearch ? undefined : initialTrips,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const hotelQuery = useQuery({
    queryKey: ["customer", "explore", "hotels", searchConstraints.hotel],
    queryFn: () => searchConstraints.hasHotelSearch ? searchHotels(searchConstraints.hotel) : getPopularHotels(100),
    initialData: searchConstraints.hasHotelSearch ? undefined : initialHotels,
    staleTime: 30000,
  });
  const guideQuery = useQuery({
    queryKey: ["customer", "explore", "guides"],
    queryFn: () => getDiscoveryListings("guides"),
    initialData: initialGuides,
    staleTime: 30000,
  });
  const tourQuery = useQuery({
    queryKey: ["customer", "explore", "tours"],
    queryFn: () => getDiscoveryListings("tours"),
    initialData: initialTours,
    staleTime: 30000,
  });
  const trips = bookableTrips(tripQuery.data ?? []).filter(trip => matchesExploreJourney(trip, searchConstraints, vehicleCategory(trip)));
  // Vehicle cards are trips: this lets a card show its seats, trip type and pickup point.
  const tripsById = useMemo(
    () => new Map((tripQuery.data ?? []).map((trip) => [trip.id, trip] as const)),
    [tripQuery.data],
  );
  const verifiedPlaces = [
    ...(hotelQuery.data ?? [])
      .filter((hotel) => hotel.isVerified)
      .map((hotel) => hotel.location.city),
    ...(guideQuery.data ?? [])
      .filter((guide) => guide.verified)
      .map((guide) => guide.destination),
  ];
  const destinations = filterDestinations(filters, trips, verifiedPlaces);
  const matchesRegion = (place: string) =>
    filters.region === "all" ||
    EXPLORE_DESTINATIONS.some(
      (destination) =>
        destination.region === filters.region &&
        destinationMatches(destination, place),
    );
  // The catalog (cards, categories, server-side filters) comes from GET /api/discover.
  const { base: discoverBase, category: discoverCategory } = discoverParamsFromUrl(params);
  const discoverQuery = useQuery({
    queryKey: ["customer", "explore", "discover", discoverBase, discoverCategory],
    queryFn: () => getDiscover({ ...discoverBase, category: discoverCategory }),
    staleTime: 30000,
    // Keep the current cards on screen while new filters load: no flash, no layout shift.
    placeholderData: keepPreviousData,
  });
  // If the default sub-type (e.g. "Hotels") has no listings, show the first one that does.
  const availableCategories = discoverQuery.data?.options.categories ?? [];
  const fallbackCategory =
    discoverCategory &&
    availableCategories.length > 0 &&
    !availableCategories.some((option) => option.id === discoverCategory)
      ? availableCategories[0].id
      : undefined;
  const fallbackQuery = useQuery({
    queryKey: ["customer", "explore", "discover", discoverBase, fallbackCategory],
    queryFn: () => getDiscover({ ...discoverBase, category: fallbackCategory }),
    staleTime: 30000,
    enabled: !!fallbackCategory,
  });
  const activeDiscover = fallbackCategory ? fallbackQuery : discoverQuery;
  const discoverData = activeDiscover.data;
  // A previous answer for another category must not show under this one.
  const freshData = discoverData && discoverData.service === service ? discoverData : undefined;
  // Price range, rating, map area and the extra sorts are applied here (the API has no such parameters).
  const cards = refineCards(
    (freshData?.items ?? []).filter((card) => matchesRegion(card.city)),
    refine,
  );
  const stayParams = new URLSearchParams();
  for (const key of ["checkIn", "checkOut", "adults", "children", "rooms"]) {
    const value = params.get(key);
    if (value) stayParams.set(key, value);
  }

  const selectedPlace = modal?.kind === "destination" ? modal.place : undefined;
  const selectedInventory = selectedPlace
    ? destinationInventory(selectedPlace, trips)
    : undefined;
  const selectedHotels = selectedPlace
    ? (hotelQuery.data ?? []).filter((hotel) =>
        destinationMatches(selectedPlace, hotel.location.city),
      )
    : [];
  const selectedGuides = selectedPlace
    ? (guideQuery.data ?? []).filter((guide) =>
        destinationMatches(selectedPlace, guide.destination),
      )
    : [];
  const selectedTours = selectedPlace
    ? (tourQuery.data ?? []).filter((tour) =>
        destinationMatches(selectedPlace, tour.destination),
      )
    : [];
  const replace = (next: URLSearchParams) =>
    router.replace(`/explore${next.size ? `?${next}` : ""}`, { scroll: false });
  const updateFilters = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (
        value === null ||
        value === "" ||
        value === "all" ||
        value === "featured"
      )
        next.delete(key);
      else next.set(key, value);
    }
    replace(next);
  };
  /** Drop every listing filter; keep the category and the destination filters. */
  const clearListingFilters = (nextService: ExploreService = service) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of LISTING_KEYS) next.delete(key);
    next.set("service", nextService);
    replace(next);
  };
  const clearFilters = () => router.replace("/explore", { scroll: false });
  const openRoads = () => setModal({ kind: "roads" });
  const modalTitle =
    modal?.kind === "destination"
      ? modal.place.name
      : modal?.kind === "listing"
        ? modal.listing.name
        : modal?.kind === "filters"
          ? "Filter destinations"
          : "Plan your mountain route";
  const searchTripsHref = (place: ExploreDestination) => {
    const trip = destinationInventory(place, trips).cheapest;
    return rideSearchHref({
      from: trip?.from ?? "Islamabad",
      to: trip?.to ?? place.searchName,
      date: trip?.date.slice(0, 10) ?? pakistanDate(),
      passengers: 1,
    });
  };

  // "What are you looking for?" — every time Explore opens without a service already chosen
  // (e.g. from the header link, not from a Home search). Decided once per visit to the page,
  // so changing filters afterwards never brings it back.
  const [picker, setPicker] = useState<null | "choose" | "locating">(() =>
    searchParams.has("service") ? null : "choose",
  );
  const closePicker = () => setPicker(null);

  return (
    <div className={`${layout.page} ${styles.page} ${layout.legacyReset}`}>
      {picker && (
        <ServicePicker
          startWith={picker}
          onClose={closePicker}
          onPick={(next) => {
            closePicker();
            clearListingFilters(next);
          }}
        />
      )}
      <div className={layout.container}>
        <header className={layout.intro}>
          <h1>Explore Gilgit-Baltistan</h1>
          <p>Rides, stays, tours, guides and restaurants across the northern valleys.</p>
        </header>
      </div>

      <ExploreFilterBar
        service={service}
        params={params}
        query={filters.query}
        options={freshData?.options}
        selectedCategory={freshData?.applied.category ?? null}
        update={updateFilters}
        replace={replace}
        clearAll={() => clearListingFilters()}
        matchesRegion={matchesRegion}
      />

      <div className={layout.container}>
        <ExploreResults
          service={service}
          view={refine.view}
          cards={cards}
          trips={tripsById}
          loading={!freshData && !activeDiscover.isError}
          error={activeDiscover.isError && !freshData}
          retry={() => {
            void activeDiscover.refetch();
          }}
          clear={() => clearListingFilters()}
          hrefFor={(card) => listingHref(card, stayParams)}
          area={refine.bbox}
          update={updateFilters}
          switchService={(next) => clearListingFilters(next)}
          onNearMe={() => setPicker("locating")}
          fullMapHref={`/explore/map${searchParams.size ? `?${searchParams}` : ""}`}
        />

        <section className={layout.promo} aria-labelledby="featured-title">
          <HomeImage src="/explore/hunza-expedition.jpg" alt="Autumn landscape in Hunza Valley" />
          <div className={layout.promoContent}>
            <span className={layout.promoBadge}>
              <Mountain size={14} aria-hidden="true" />
              Northern escapes
            </span>
            <h2 id="featured-title">Hunza Valley Autumn Expedition</h2>
            <p>
              Golden poplar season, mountain terraces, turquoise waters and
              silk-route hospitality in the Karakoram.
            </p>
            <div className={layout.promoActions}>
              <button
                type="button"
                className={layout.primaryButton}
                onClick={() => setModal({ kind: "destination", place: EXPLORE_DESTINATIONS[0] })}
              >
                View rides & stays
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button type="button" className={layout.secondaryButton} onClick={openRoads}>
                <TriangleAlert size={16} aria-hidden="true" />
                Road advisory
              </button>
            </div>
          </div>
        </section>

        <section className={layout.section} aria-labelledby="destinations-heading">
          <ExploreSectionHeader
            id="destinations-heading"
            eyebrow="Northern corridors"
            title="Popular destinations"
          >
            <span className={layout.count}>
              Displaying <strong>{destinations.length}</strong>{" "}
              {destinations.length === 1 ? "valley" : "valleys"}
            </span>
            <button
              type="button"
              className={layout.chip}
              onClick={() => setModal({ kind: "filters" })}
              aria-pressed={filters.region !== "all" || filters.maxAltitude < 5000 || Number.isFinite(filters.maxPrice)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filter
            </button>
            <ChipDropdown
              label="Sort destinations"
              align="end"
              icon={<ArrowUpDown size={16} aria-hidden="true" />}
              value={filters.sort}
              active={filters.sort !== "featured"}
              onChange={(value) => updateFilters({ sort: value })}
              options={[
                { value: "featured", label: "Featured", hint: "Our picks first", icon: <Sparkles size={16} aria-hidden="true" /> },
                { value: "name", label: "Name A–Z", hint: "Alphabetical", icon: <ArrowDownAZ size={16} aria-hidden="true" /> },
                { value: "price", label: "Lowest fare", hint: "Cheapest rides first", icon: <ArrowUpNarrowWide size={16} aria-hidden="true" /> },
              ]}
            />
          </ExploreSectionHeader>
          {tripQuery.isError && (
            <div className={styles.notice} role="status">
              Transport availability could not be refreshed.{" "}
              <button
                type="button"
                onClick={() => {
                  void tripQuery.refetch();
                }}
              >
                Retry transport
              </button>
            </div>
          )}
          {destinations.length ? (
            <div className={layout.destinationGrid}>
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                  trips={trips}
                  saved={favorites.saved.has(destination.id)}
                  savePending={favorites.pending}
                  onSave={() => favorites.toggle(destination.id)}
                  onExplore={() =>
                    setModal({ kind: "destination", place: destination })
                  }
                />
              ))}
            </div>
          ) : (
            <div className={layout.state}>
              <h3>No valleys match these filters</h3>
              <p>Try another region or clear your filters to see all six destinations.</p>
              <button type="button" className={layout.primaryButton} onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className={layout.section} aria-labelledby="road-heading">
          <ExploreSectionHeader
            id="road-heading"
            eyebrow="Mountain route planning"
            title="Mountain passes & road information"
          >
            <span className={layout.hidePhone}>Confirm live conditions before departure</span>
          </ExploreSectionHeader>
          <div className={layout.passGrid}>
            {ROAD_PLANS.map((road) => (
              <article key={road.title} className={layout.pass}>
                <div className={layout.passTop}>
                  <small>{road.label}</small>
                  <span className={layout.status}>
                    <TriangleAlert size={12} aria-hidden="true" />
                    Check access
                  </span>
                </div>
                <h3>{road.title}</h3>
                <p>{road.body}</p>
                <button type="button" onClick={openRoads}>
                  {road.note}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      {modal && (
        <HomeDialog title={modalTitle} onClose={() => setModal(null)}>
          {modal.kind === "filters" ? (
            <form
              className={styles.filterForm}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                updateFilters({
                  region: String(form.get("region") ?? "all"),
                  altitude:
                    String(form.get("altitude")) === "5000"
                      ? null
                      : String(form.get("altitude")),
                  price: String(form.get("price") ?? "") || null,
                });
                setModal(null);
              }}
            >
              <label>
                Region
                <select name="region" defaultValue={filters.region}>
                  {EXPLORE_REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Maximum altitude
                <select
                  name="altitude"
                  defaultValue={String(Math.min(filters.maxAltitude, 5000))}
                >
                  <option value="2500">Up to 2,500 m</option>
                  <option value="3500">Up to 3,500 m</option>
                  <option value="4500">Up to 4,500 m</option>
                  <option value="5000">All altitudes</option>
                </select>
              </label>
              <label>
                Maximum published transit fare (Rs)
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Any price"
                  defaultValue={
                    Number.isFinite(filters.maxPrice) ? filters.maxPrice : ""
                  }
                />
              </label>
              <p>
                Fare filtering includes destinations with a current scheduled
                departure. Road access and weather must be confirmed with your
                provider.
              </p>
              <button type="submit" className={styles.primary}>
                Apply filters
              </button>
            </form>
          ) : modal.kind === "roads" ? (
            <div className={styles.dialogContent}>
              <p>
                Mountain conditions change with weather and the season. Live
                road and weather data are not currently supplied by the BANJARA
                API.
              </p>
              <ul>
                <li>
                  Confirm the route, road opening, and departure time with your
                  provider.
                </li>
                <li>
                  Ask about the vehicle, planned stops, and alternatives for
                  high passes.
                </li>
                <li>
                  Carry suitable layers and follow current local travel
                  guidance.
                </li>
              </ul>
              <Link className={styles.primary} href="/explore?service=transport">
                Find a transport provider
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : modal.kind === "listing" ? (
            <div className={styles.dialogContent}>
              <HomeImage
                src={modal.listing.image}
                alt={modal.listing.name}
                className={styles.dialogImage}
              />
              <p>
                {modal.listing.destination} ·{" "}
                {modal.listing.details.join(" · ")}
              </p>
              <p>{modal.listing.description}</p>
              {modal.listing.price > 0 && (
                <strong>
                  From Rs {modal.listing.price.toLocaleString("en-PK")} ·{" "}
                  {modal.listing.priceUnit}
                </strong>
              )}
              {modal.listing.phone && (
                <a
                  className={styles.primary}
                  href={`tel:${modal.listing.phone.replace(/[^+\d]/g, "")}`}
                >
                  Call provider
                </a>
              )}
            </div>
          ) : (
            selectedPlace && (
              <div className={styles.dialogContent}>
                <HomeImage
                  src={selectedPlace.image}
                  alt={selectedPlace.name}
                  className={styles.dialogImage}
                />
                <p>{selectedPlace.description}</p>
                <div className={styles.dialogActions}>
                  <Link
                    className={styles.primary}
                    href={searchTripsHref(selectedPlace)}
                  >
                    Search transport
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    className={styles.secondary}
                    href={`/explore?service=hotels&${new URLSearchParams({ destination: selectedPlace.searchName, checkIn: pakistanDate(), checkOut: addDaysIso(2, pakistanDate()), adults: "2", children: "0", rooms: "1" })}`}
                  >
                    Find stays
                  </Link>
                </div>
                <h3>Current transport links</h3>
                {tripQuery.isPending ? (
                  <p>Checking departures…</p>
                ) : tripQuery.isError ? (
                  <p>Transport is unavailable right now. Please try again.</p>
                ) : selectedInventory?.trips.length ? (
                  selectedInventory.trips.slice(0, 5).map((trip) => (
                    <Link
                      className={styles.resourceLink}
                      href={`/trips/${trip.id}`}
                      key={trip.id}
                    >
                      <span>
                        {trip.agency.name}
                        <small>
                          {trip.from} → {trip.to} · {trip.date.slice(0, 10)}
                        </small>
                      </span>
                      <strong>
                        Rs {trip.price.toLocaleString("en-PK")}
                        <small>
                          per{" "}
                          {trip.bookingMode === "vehicle" ? "vehicle" : "seat"}
                        </small>
                      </strong>
                    </Link>
                  ))
                ) : (
                  <p>
                    No upcoming departures are listed for this destination yet.
                  </p>
                )}
                <h3>Places to stay</h3>
                {hotelQuery.isError ? (
                  <p>Stays could not be loaded. Please try again.</p>
                ) : hotelQuery.isPending ? (
                  <p>Checking places to stay…</p>
                ) : selectedHotels.length ? (
                  selectedHotels.slice(0, 4).map((hotel) => (
                    <Link
                      className={styles.resourceLink}
                      href={`/hotels/${hotel.id}`}
                      key={hotel.id}
                    >
                      <span>{hotel.name}</span>
                      <strong>
                        Rs {hotel.priceFrom.toLocaleString("en-PK")}
                        <small>per night</small>
                      </strong>
                    </Link>
                  ))
                ) : (
                  <p>No stays are currently listed in this destination.</p>
                )}
                <h3>Local guides & tours</h3>
                {[...selectedGuides, ...selectedTours].length ? (
                  [...selectedGuides, ...selectedTours]
                    .slice(0, 6)
                    .map((listing) => (
                      <button
                        className={styles.resourceLink}
                        key={listing.id}
                        type="button"
                        onClick={() => setModal({ kind: "listing", listing })}
                      >
                        <span>{listing.name}</span>
                        <ArrowRight size={16} />
                      </button>
                    ))
                ) : (
                  <p>No guide or tour listings are currently available here.</p>
                )}
              </div>
            )
          )}
        </HomeDialog>
      )}
    </div>
  );
}
