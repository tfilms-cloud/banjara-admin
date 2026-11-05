"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@/lib/live-query";
import {
  ArrowRight,
  ArrowUpDown,
  Compass,
  Mountain,
  Navigation,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import {
  HomeDialog,
  HomeImage,
  HomeState,
  SectionHeading,
} from "@/components/site/home/home-primitives";
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
import {
  ExploreDiscoverFilters,
  ExploreDiscoverResults,
  ExploreServiceSelector,
} from "./service-catalog";
import { TransporterCards } from "@/components/site/agency/transporter-cards";
import { getDiscover } from "@/services/customer/discover.service";
import { discoverParamsFromUrl } from "@/lib/explore-discover";
import { ExploreMapPreview } from "@/components/site/map/explore-map-preview";
import { catalogMatches, readCatalogFilters } from "@/lib/explore-catalog";
import styles from "./explore.module.css";

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
const SEARCH_HINT = {
  transport: "Search vehicles, operators or routes…",
  hotels: "Search hotels or destinations…",
  tours: "Search tours or destinations…",
  guides: "Search guides or places…",
  restaurants: "Search restaurants or cuisine…",
} as const;
const ROAD_PLANS = [
  {
    label: "ALT: 4,173 m",
    title: "Babusar Pass",
    body: "Confirm seasonal opening, departure time, and the planned route with your provider before traveling.",
    note: "Ask about the KKH alternative",
  },
  {
    label: "N–35 ARTERY",
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
    label: "ALT: 4,114 m",
    title: "Deosai High Plateau",
    body: "Discuss seasonal access, weather preparation, and a suitable high-clearance vehicle with your local provider.",
    note: "Plan a suitable mountain vehicle",
  },
];

export function WebsiteExplore({
  initialTrips,
  initialHotels,
  initialGuides,
  initialTours,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = readExploreFilters(
    new URLSearchParams(searchParams.toString()),
  );
  const [modal, setModal] = useState<Modal | null>(null);
  const catalogFilters = readCatalogFilters(
    new URLSearchParams(searchParams.toString()),
  );
  const searchConstraints = readExploreSearch(new URLSearchParams(searchParams.toString()));
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
  // The catalog (cards, sort and filter chips, categories) comes from GET /api/discover.
  const { base: discoverBase, category: discoverCategory } = discoverParamsFromUrl(
    new URLSearchParams(searchParams.toString()),
  );
  const discoverQuery = useQuery({
    queryKey: ["customer", "explore", "discover", discoverBase, discoverCategory],
    queryFn: () => getDiscover({ ...discoverBase, category: discoverCategory }),
    staleTime: 30000,
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
    router.replace(`/explore${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters({
      q: String(new FormData(event.currentTarget).get("q") ?? "").trim(),
    });
  };
  const clearFilters = () => router.replace("/explore", { scroll: false });
  const openRoads = () => setModal({ kind: "roads" });
  const modalTitle =
    modal?.kind === "destination"
      ? modal.place.name
      : modal?.kind === "listing"
        ? modal.listing.name
        : modal?.kind === "filters"
          ? "Explore filters"
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.intro} aria-labelledby="explore-title">
          <div className={styles.toolbar}>
            <div className={styles.toolbarTop}>
              <div>
                <h1 id="explore-title">Explore the north</h1>
                <p className={styles.lead}>
                  Rides, stays, tours, guides and restaurants.
                </p>
              </div>
              <ExploreServiceSelector
                filters={catalogFilters}
                update={updateFilters}
              />
            </div>
            <form className={styles.searchBar} onSubmit={search}>
              <Compass size={19} />
              <input
                key={`${catalogFilters.service}-${filters.query}`}
                name="q"
                defaultValue={filters.query}
                aria-label="Search Explore"
                placeholder={SEARCH_HINT[catalogFilters.service]}
                maxLength={160}
              />
              <button
                type="button"
                className={styles.filterButton}
                onClick={() => setModal({ kind: "filters" })}
              >
                <SlidersHorizontal size={15} />
                <span className={styles.filterLabel}>Filters</span>
              </button>
              <button type="submit" className={styles.primary}>
                <Search size={16} />
                Search
              </button>
            </form>
            <div className={styles.toolbarFilters}>
              <ExploreDiscoverFilters
                filters={catalogFilters}
                data={discoverData}
                selectedCategory={discoverData?.applied.category ?? null}
                update={updateFilters}
              />
              {searchParams.size > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={styles.clear}
                >
                  Reset all
                </button>
              )}
            </div>
          </div>
        </section>

        <section className={styles.hero} aria-labelledby="featured-title">
          <HomeImage
            src="/explore/hunza-expedition.jpg"
            alt="Autumn landscape in Hunza Valley"
            eager
          />
          <div className={styles.heroContent}>
            <div className={styles.heroBadges}>
              <span>NORTHERN ESCAPES</span>
              <span>
                <Mountain size={15} />
                Karakoram valleys & mountain stays
              </span>
            </div>
            <h2 id="featured-title">Hunza Valley Autumn Expedition</h2>
            <p>
              Golden poplar season, mountain terraces, turquoise waters, and
              ancient silk-route hospitality. Discover your next journey through
              the Karakoram basin.
            </p>
            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() =>
                  setModal({
                    kind: "destination",
                    place: EXPLORE_DESTINATIONS[0],
                  })
                }
              >
                View Transit Links & Stays
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={openRoads}
              >
                <TriangleAlert size={17} />
                Check Road Advisory
              </button>
            </div>
          </div>
        </section>

        {((catalogFilters.service === "transport" && searchConstraints.hasTripSearch) || (catalogFilters.service === "hotels" && searchConstraints.hasHotelSearch)) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" role="status">
            <p>{catalogFilters.service === "hotels"
              ? [searchConstraints.hotel.destination, searchConstraints.hotel.checkIn, searchConstraints.hotel.checkOut, `${searchConstraints.hotel.adults + searchConstraints.hotel.children} guests`].filter(Boolean).join(" · ")
              : [searchConstraints.trip.from, searchConstraints.trip.to, searchConstraints.trip.date, `${searchConstraints.trip.passengers} travelers`].filter(Boolean).join(" · ")}</p>
            <button type="button" className={styles.secondary} onClick={() => router.replace(`/explore?service=${catalogFilters.service}`)}>Clear search</button>
          </div>
        )}
        <div className={styles.split}>
          <aside className={styles.splitMap} aria-label="Map">
            <ExploreMapPreview
              tall
              base={discoverBase}
              category={fallbackCategory ?? discoverCategory}
              href={`/explore/map${searchParams.size ? `?${searchParams}` : ""}`}
            />
          </aside>
          <div className={styles.splitMain}>
        <ExploreDiscoverResults
          filters={catalogFilters}
          data={discoverData}
          loading={activeDiscover.isPending}
          error={activeDiscover.isError}
          retry={() => {
            void activeDiscover.refetch();
          }}
          clear={() => {
            router.replace(`/explore?service=${catalogFilters.service}`, {
              scroll: false,
            });
          }}
          matchesRegion={matchesRegion}
        />
        {catalogFilters.service === "transport" &&
          !activeDiscover.isPending &&
          !activeDiscover.isError && (
            <TransporterCards
              trips={trips.filter(
                (trip) =>
                  matchesRegion(trip.to) &&
                  catalogMatches(
                    filters.query,
                    trip.vehicleName,
                    trip.vehicleType,
                    trip.agency.name,
                    trip.from,
                    trip.to,
                  ),
              )}
            />
          )}
          </div>
        </div>

        <section
          className={styles.destinations}
          aria-label="Curated destinations"
        >
          <div className={styles.sectionTop}>
            <SectionHeading
              eyebrow="NORTHERN CORRIDORS"
              title="Curated Alpine Destinations & Waypoints"
              description=""
            />
            <label className={styles.sort}>
              <span>
                Displaying {destinations.length}{" "}
                {destinations.length === 1 ? "valley" : "valleys"}
              </span>
              <ArrowUpDown size={15} />
              <select
                aria-label="Sort destinations"
                value={filters.sort}
                onChange={(event) =>
                  updateFilters({ sort: event.target.value })
                }
              >
                <option value="featured">Featured</option>
                <option value="name">Name A–Z</option>
                <option value="price">Transit fare: low to high</option>
              </select>
            </label>
          </div>
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
            <div className={styles.destinationGrid}>
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
            <HomeState
              title="No valleys match these filters"
              description="Try another region or clear your filters to see all six destinations."
              retry={clearFilters}
              retryLabel="Clear filters"
            />
          )}
        </section>

        <section className={styles.roadTracker} aria-labelledby="road-heading">
          <div className={styles.roadHeading}>
            <div>
              <p>
                <Navigation size={19} />
                MOUNTAIN ROUTE PLANNING
              </p>
              <h2 id="road-heading">
                Mountain Pass & Arterial Road Information
              </h2>
            </div>
            <span>Confirm live conditions before departure</span>
          </div>
          <div className={styles.roadGrid}>
            {ROAD_PLANS.map((road) => (
              <article key={road.title}>
                <div>
                  <small>{road.label}</small>
                  <span className={styles.unknown}>CHECK ACCESS</span>
                </div>
                <h3>{road.title}</h3>
                <p>{road.body}</p>
                <button type="button" onClick={openRoads}>
                  {road.note}
                  <ArrowRight size={13} />
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
