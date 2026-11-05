"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@/lib/live-query";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BusFront,
  CalendarDays,
  CarFront,
  Check,
  Circle,
  Compass,
  Headphones,
  KeyRound,
  MapPin,
  Mountain,
  Navigation,
  Search,
  ShieldCheck,
  Snowflake,
  Tag,
  UsersRound,
  Utensils,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HotelCard } from "@/components/site/hotel-card";
import { useTripFavorites } from "@/hooks/use-trip-favorites";
import { addDaysIso } from "@/lib/customer-destinations";
import {
  bookableTrips,
  HOME_DESTINATIONS,
  pakistanDate,
  rideSearchHref,
  vehicleCategory,
} from "@/lib/home-discovery";
import { getPopularHotels } from "@/services/customer/hotel.service";
import { getRecommendedTrips } from "@/services/customer/trip.service";
import {
  getDiscoveryListings,
  type DiscoveryListing,
} from "@/services/customer/discovery.service";
import { getDiscover } from "@/services/customer/discover.service";
import type { TripWithDetails } from "@/types/customer/trip";
import type { Hotel } from "@/types/customer/hotel";
import {
  HomeDialog,
  HomeImage,
  HomeState,
  SectionHeading,
} from "./home-primitives";
import { HomeRideCard } from "./home-ride-card";
import { HomeStories } from "./home-stories";
import styles from "./home.module.css";

const SERVICES = [
  { id: "ride", name: "Ride", icon: BusFront },
  { id: "stay", name: "Stay", icon: BedDouble },
  { id: "tours", name: "Tours", icon: Mountain },
  { id: "guides", name: "Guides", icon: MapPin },
  { id: "restaurants", name: "Restaurants", icon: Utensils },
] as const;
type Service = (typeof SERVICES)[number]["id"];

/** Restaurants for the Home teaser, from the shared discover feed. */
async function getHomeRestaurants(city: string): Promise<DiscoveryListing[]> {
  const result = await getDiscover({ service: "restaurants", city: city || undefined, limit: 6 });
  return result.items.map((card) => ({
    id: card.id,
    name: card.title,
    destination: card.city,
    description: "",
    rating: card.rating ?? undefined,
    reviewCount: card.reviewCount,
    image: card.image ?? "",
    price: 0,
    priceUnit: "",
    verified: card.verified,
    details: [...card.tags, ...(card.offers ?? []).map((offer) => offer.title)],
  }));
}

export function WebsiteHome({
  initialTrips,
  initialHotels,
}: {
  initialTrips?: TripWithDetails[];
  initialHotels?: Hotel[];
}) {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const favorites = useTripFavorites();
  const [mode, setMode] = useState<Service>("ride");
  const [custom, setCustom] = useState(false);
  const [roundTrip, setRoundTrip] = useState(false);
  const [bookingMode, setBookingMode] = useState("seat");
  const [vehicle, setVehicle] = useState("");
  const [from, setFrom] = useState("Islamabad");
  const [to, setTo] = useState("Hunza");
  const [date, setDate] = useState(pakistanDate);
  const [endDate, setEndDate] = useState(() => addDaysIso(2, pakistanDate()));
  const [passengers, setPassengers] = useState(1);
  const [catalogDestination, setCatalogDestination] = useState("");
  const [catalogDate, setCatalogDate] = useState<string>();
  const [catalogGuests, setCatalogGuests] = useState<number>();
  const [searchError, setSearchError] = useState("");
  const [modal, setModal] = useState<
    "help" | "road" | "snow" | DiscoveryListing | null
  >(null);
  const tripsQuery = useQuery({
    queryKey: ["customer", "home-trips"],
    queryFn: () => getRecommendedTrips(100),
    initialData: initialTrips,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const hotelsQuery = useQuery({
    queryKey: ["customer", "home-hotels"],
    queryFn: () => getPopularHotels(12),
    initialData: initialHotels,
    staleTime: 30000,
    enabled: mode === "stay",
  });
  const catalogKind =
    mode === "guides" ? "guides" : mode === "restaurants" ? "restaurants" : "tours";
  const catalogQuery = useQuery({
    queryKey: [
      "customer",
      "home-catalog",
      catalogKind,
      catalogDestination,
      catalogDate,
      catalogGuests,
    ],
    queryFn: () =>
      catalogKind === "restaurants"
        ? getHomeRestaurants(catalogDestination)
        : getDiscoveryListings(
            catalogKind,
            catalogDestination,
            catalogDate,
            catalogGuests,
          ),
    enabled: mode === "guides" || mode === "tours" || mode === "restaurants",
    staleTime: 30000,
  });
  const trips = bookableTrips(tripsQuery.data ?? []);
  const categories = [...new Set(trips.map(vehicleCategory))].slice(0, 5);
  const visibleTrips = trips.filter(
    (trip) =>
      (!vehicle || vehicleCategory(trip) === vehicle) &&
      (!custom || (trip.bookingMode ?? "seat") === bookingMode),
  );
  const todayCount = trips.filter(
    (trip) => trip.date.slice(0, 10) === pakistanDate(),
  ).length;
  const isRide = mode === "ride";
  /** Tours and restaurants are searched by destination only (no dates or travelers). */
  const destinationOnly = mode === "tours" || mode === "restaurants";
  const isStay = mode === "stay";
  const switchMode = (next: Service) => {
    setMode(next);
    setVehicle("");
    setCatalogDestination("");
    setCatalogDate(undefined);
    setCatalogGuests(undefined);
  };
  const scrollToListings = () =>
    document
      .getElementById("home-listings")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const submittedFrom = String(values.get("from") ?? from).trim();
    const submittedTo = String(values.get("to") ?? to).trim();
    const submittedDate = String(values.get("date") ?? date);
    const submittedEndDate = String(values.get("endDate") ?? endDate);
    const submittedPassengers = Number(values.get("passengers") ?? passengers);
    if (
      !submittedTo ||
      (isRide &&
        (!submittedFrom ||
          submittedFrom.toLowerCase() === submittedTo.toLowerCase()))
    ) {
      setSearchError("Choose a destination and a different departure city.");
      return;
    }
    setSearchError("");
    if (
      (isStay || (isRide && roundTrip)) &&
      submittedEndDate < addDaysIso(isStay ? 1 : 0, submittedDate)
    ) {
      setSearchError(
        isStay
          ? "Check-out must be after check-in."
          : "Return date must be on or after departure.",
      );
      return;
    }
    if (isStay) {
      router.push(
        `/explore?service=hotels&${new URLSearchParams({ destination: submittedTo, checkIn: submittedDate, checkOut: submittedEndDate, adults: String(submittedPassengers), children: "0", rooms: "1" })}`,
      );
    } else if (isRide) {
      router.push(
        rideSearchHref({
          from: submittedFrom,
          to: submittedTo,
          date: submittedDate,
          passengers: submittedPassengers,
          roundTrip,
          returnDate: submittedEndDate,
          vehicle,
          bookingMode: custom ? bookingMode : undefined,
        }),
      );
    } else if (mode === "restaurants") {
      setCatalogDestination(submittedTo);
      scrollToListings();
    } else {
      setCatalogDestination(submittedTo);
      setCatalogDate(mode === "guides" ? submittedDate : undefined);
      setCatalogGuests(mode === "guides" ? submittedPassengers : undefined);
      scrollToListings();
    }
  }
  const searchLabel = isStay
    ? "Search stays"
    : mode === "guides"
      ? "Find guides"
      : mode === "tours"
        ? "Explore tours"
        : mode === "restaurants"
          ? "Find restaurants"
          : "Search rides";

  return (
    <div className={styles.home}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.statusRow}>
            <p className={styles.status}>
              <span className={styles.liveDot} />
              {tripsQuery.isError
                ? "Live departures unavailable"
                : tripsQuery.isPending
                  ? "Checking departures"
                  : `${todayCount} ${todayCount === 1 ? "ride" : "rides"} today`}
              <span className={styles.statusDivider} />
              <Navigation size={14} />
              Northern Pakistan, connected
            </p>
            <span className={styles.protection}>
              <ShieldCheck size={17} />
              YOUR JOURNEY. YOUR WAY.
            </span>
          </div>
          <p className={styles.heroEyebrow}>NORTHERN EXPEDITION DISPATCH</p>
          <h1 id="home-title">
            {user?.name
              ? `Welcome back, ${user.name.split(" ")[0]}`
              : "Your next journey starts here"}{" "}
            — Islamabad to Hunza
          </h1>
          <p className={styles.heroDescription}>
            Reserve mountain rides, panoramic 4×4 private charters, and direct
            coaster
            <br className={styles.desktopBreak} /> departures across the
            Karakoram Highway.
          </p>

          <div className={styles.searchCard}>
            <div className={styles.searchTop}>
              <div
                className={styles.serviceTabs}
                role="tablist"
                aria-label="Travel service"
              >
                {SERVICES.map((service, index) => (
                  <button
                    id={`service-tab-${service.id}`}
                    key={service.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === service.id}
                    aria-controls="home-search-panel"
                    tabIndex={mode === service.id ? 0 : -1}
                    onClick={() => switchMode(service.id)}
                    onKeyDown={(event) => {
                      if (
                        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          event.key,
                        )
                      ) {
                        event.preventDefault();
                        const next =
                          event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? SERVICES.length - 1
                              : (index +
                                  (event.key === "ArrowRight" ? 1 : -1) +
                                  SERVICES.length) %
                                SERVICES.length;
                        switchMode(SERVICES[next].id);
                        document
                          .getElementById(`service-tab-${SERVICES[next].id}`)
                          ?.focus();
                      }
                    }}
                  >
                    <service.icon size={17} />
                    {service.name}
                  </button>
                ))}
              </div>
              {isRide && (
                <div className={styles.routeTabs} aria-label="Route options">
                  <button
                    type="button"
                    aria-pressed={!custom}
                    onClick={() => setCustom(false)}
                  >
                    Available rides
                  </button>
                  <button
                    type="button"
                    aria-pressed={custom}
                    onClick={() => setCustom(true)}
                  >
                    Customise route
                  </button>
                </div>
              )}
            </div>
            <div
              id="home-search-panel"
              role="tabpanel"
              aria-labelledby={`service-tab-${mode}`}
            >
              <form onSubmit={submit}>
                <div
                  className={`${styles.searchFields} ${!isRide ? styles.destinationSearch : ""} ${destinationOnly ? styles.toursSearch : ""}`}
                >
                  {isRide && (
                    <>
                      <label className={styles.field}>
                        <Circle size={18} />
                        <span>
                          <small>FROM</small>
                          <input
                            aria-label="From"
                            name="from"
                            list="home-locations"
                            required
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                          />
                        </span>
                      </label>
                      <button
                        className={styles.swap}
                        type="button"
                        aria-label="Swap origin and destination"
                        onClick={() => {
                          setFrom(to);
                          setTo(from);
                        }}
                      >
                        <ArrowLeftRight size={20} />
                      </button>
                    </>
                  )}
                  <label className={styles.field}>
                    <MapPin size={19} className={styles.coral} />
                    <span>
                      <small>{isRide ? "TO" : "DESTINATION"}</small>
                      <input
                        aria-label={isRide ? "To" : "Destination"}
                        name="to"
                        list="home-locations"
                        required
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                      />
                    </span>
                  </label>
                  {!destinationOnly && (
                    <label className={styles.field}>
                      <CalendarDays size={19} />
                      <span>
                        <small>{isStay ? "CHECK-IN" : "DEPARTURE"}</small>
                        <input
                          aria-label={isStay ? "Check-in" : "Departure date"}
                          name="date"
                          type="date"
                          required
                          min={pakistanDate()}
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            if (
                              event.target.value &&
                              endDate <= event.target.value
                            )
                              setEndDate(addDaysIso(2, event.target.value));
                          }}
                        />
                      </span>
                    </label>
                  )}
                  {(isStay || (roundTrip && isRide)) && (
                    <label className={styles.field}>
                      <CalendarDays size={19} />
                      <span>
                        <small>{isStay ? "CHECK-OUT" : "RETURN"}</small>
                        <input
                          aria-label={isStay ? "Check-out" : "Return date"}
                          name="endDate"
                          required
                          type="date"
                          min={addDaysIso(
                            isStay ? 1 : 0,
                            date || pakistanDate(),
                          )}
                          value={endDate}
                          onChange={(event) => setEndDate(event.target.value)}
                        />
                      </span>
                    </label>
                  )}
                  {!destinationOnly && (
                    <label
                      className={`${styles.field} ${styles.passengerField}`}
                    >
                      <UsersRound size={18} />
                      <span>
                        <small>{isStay ? "GUESTS" : "TRAVELERS"}</small>
                        <select
                          aria-label={isStay ? "Guests" : "Travelers"}
                          name="passengers"
                          value={passengers}
                          onChange={(event) =>
                            setPassengers(Number(event.target.value))
                          }
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}{" "}
                              {isStay ? (i > 0 ? "Guests" : "Guest") : "Pax"}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                  )}
                  <button
                    className={`${styles.primary} ${styles.searchButton}`}
                    type="submit"
                  >
                    <Search size={18} />
                    {searchLabel}
                  </button>
                </div>
                <datalist id="home-locations">
                  {[
                    ...new Set([
                      "Islamabad",
                      "Hunza",
                      "Skardu",
                      "Gilgit",
                      "Swat",
                      ...trips.flatMap((trip) => [trip.from, trip.to]),
                    ]),
                  ].map((place) => (
                    <option key={place} value={place} />
                  ))}
                </datalist>
                {isRide ? (
                  <div className={styles.quickFilters}>
                    <span>Quick filters:</span>
                    <button
                      type="button"
                      aria-pressed={!roundTrip}
                      onClick={() => setRoundTrip(!roundTrip)}
                    >
                      {roundTrip ? "Round trip" : "One-way route"}
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      aria-pressed={bookingMode === "seat"}
                      onClick={() => {
                        setBookingMode(
                          bookingMode === "seat" ? "vehicle" : "seat",
                        );
                        setCustom(true);
                      }}
                    >
                      {bookingMode === "vehicle"
                        ? "Whole vehicle"
                        : "By Seat"}
                    </button>
                    {categories.map((category) => (
                      <button
                        type="button"
                        key={category}
                        aria-pressed={vehicle === category}
                        onClick={() =>
                          setVehicle(vehicle === category ? "" : category)
                        }
                      >
                        {category.includes("Jeep") ? (
                          <CarFront size={14} />
                        ) : (
                          <BusFront size={14} />
                        )}
                        {category}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.searchHint}>
                    {isStay
                      ? "Find your mountain retreat · Live hotel availability · 1 room"
                      : mode === "restaurants"
                        ? "Find a place to eat · Menus, offers and ratings from local restaurants."
                        : "Discover services published by local providers. Choose a destination to narrow your search."}
                  </p>
                )}
                {searchError && (
                  <p className={styles.searchError} role="alert">
                    {searchError}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>

        <HomeStories
          className={styles.shortcuts}
          circleClassName={styles.shortcutCircle}
          groups={[
            {
              id: "road-updates",
              title: "Road updates",
              text: "Plan your route",
              icon: Navigation,
              tone: "coral",
              cta: "See road conditions",
              action: () => setModal("road"),
              slides: [
                {
                  video: "/stories/4283.mp4",
                  place: "Karakoram Highway",
                  posted: "2h ago",
                  caption: "KKH is open end to end today. Expect short stops near Dasu for road work.",
                },
                {
                  video: "/stories/50267.mp4",
                  place: "Babusar Top",
                  posted: "5h ago",
                  caption: "Babusar Pass is clear for jeeps and cars until 4 pm. Start early.",
                },
              ],
            },
            {
              id: "find-fare",
              title: "Find your fare",
              text: "Compare departures",
              icon: Tag,
              tone: "teal",
              cta: "Compare rides",
              action: () => {
                switchMode("ride");
                scrollToListings();
              },
              slides: [
                {
                  video: "/stories/41576.mp4",
                  place: "Islamabad → Hunza",
                  posted: "1h ago",
                  caption: "Seats from Rs 6,500 on today’s coaster departures. Compare and book in seconds.",
                },
              ],
            },
            {
              id: "trending",
              title: "Trending",
              text: "Northern escapes",
              icon: Mountain,
              image: "/home/trending.jpg",
              cta: "Explore destinations",
              action: () =>
                document
                  .getElementById("home-destinations")
                  ?.scrollIntoView({ behavior: "smooth" }),
              slides: [
                {
                  video: "/stories/4132.mp4",
                  place: "Hunza Valley",
                  posted: "3h ago",
                  caption: "Autumn colours are at their peak in Hunza this week.",
                },
                {
                  video: "/stories/51791.mp4",
                  place: "Fairy Meadows",
                  posted: "8h ago",
                  caption: "Clear views of Nanga Parbat from the meadows this morning.",
                },
                {
                  video: "/stories/46384.mp4",
                  place: "Skardu",
                  posted: "1d ago",
                  caption: "Hidden waterfalls on the road to Shigar, an easy half-day trip.",
                },
              ],
            },
            {
              id: "local-guides",
              title: "Local Guides",
              text: "Meet your local expert",
              icon: Compass,
              image: "/home/local-guide.jpg",
              cta: "Find a guide",
              action: () => {
                switchMode("guides");
                scrollToListings();
              },
              slides: [
                {
                  video: "/stories/2385.mp4",
                  place: "Passu",
                  posted: "4h ago",
                  caption: "Our guides know every trail, viewpoint and tea stop in the valley.",
                },
                {
                  video: "/stories/5360.mp4",
                  place: "Nagar",
                  posted: "1d ago",
                  caption: "Book a verified local guide for treks, jeep safaris and village walks.",
                },
              ],
            },
            {
              id: "snow-season",
              title: "Snow & season",
              text: "Travel prepared",
              icon: Snowflake,
              cta: "Read the season guide",
              action: () => setModal("snow"),
              slides: [
                {
                  video: "/stories/4695.mp4",
                  place: "Khunjerab Pass",
                  posted: "6h ago",
                  caption: "First snowfall at Khunjerab. Carry warm layers above 4,000 m.",
                },
                {
                  video: "/stories/3371.mp4",
                  place: "Naltar",
                  posted: "1d ago",
                  caption: "Naltar forest roads need chains after fresh snow. Check before you go.",
                },
              ],
            },
            {
              id: "charter",
              title: "4×4 Charter",
              text: "Full vehicle",
              icon: KeyRound,
              cta: "Charter a 4×4",
              action: () => {
                switchMode("ride");
                setBookingMode("vehicle");
                setCustom(true);
                scrollToListings();
              },
              slides: [
                {
                  video: "/stories/3352.mp4",
                  place: "Deosai Plains",
                  posted: "2h ago",
                  caption: "Book a whole Land Cruiser with a local driver. Your route, your pace.",
                },
                {
                  video: "/stories/4396.mp4",
                  place: "Shimshal",
                  posted: "1d ago",
                  caption: "Off-road routes that coaches can’t reach. Prices per vehicle, not per seat.",
                },
              ],
            },
          ]}
        />

        <section
          id="home-listings"
          className={styles.section}
          aria-label="Available travel services"
        >
          <SectionHeading
            eyebrow={
              isStay
                ? "MOUNTAIN RETREATS"
                : mode === "guides"
                  ? "LOCAL EXPERTISE"
                  : mode === "tours"
                    ? "PLAN AN ADVENTURE"
                    : mode === "restaurants"
                      ? "LOCAL FLAVOURS"
                      : "LIVE DEPARTURES"
            }
            title={
              isStay
                ? "Places to stay"
                : mode === "guides"
                  ? "Local guides"
                  : mode === "tours"
                    ? "Mountain tours"
                    : mode === "restaurants"
                      ? "Restaurants"
                      : "Available rides"
            }
            description={
              isStay
                ? "Hotels and guest houses near your next destination."
                : isRide
                  ? "Scheduled rides and private vehicles, published by local providers."
                  : "Explore the north with services from the BANJARA provider network."
            }
            href={
              isRide
                ? `/trips?${new URLSearchParams({ ...(vehicle ? { vehicle } : {}), ...(custom && bookingMode === "vehicle" ? { bookingMode: "vehicle" } : {}) })}`
                : isStay
                  ? "/hotels"
                  : `/explore?service=${mode}`
            }
            action={
              isRide
                ? `View all (${visibleTrips.length} rides)`
                : isStay
                  ? "Browse stays"
                  : `Browse all ${mode}`
            }
          />
          {isRide ? (
            tripsQuery.isPending ? (
              <HomeState
                loading
                title="Checking departures…"
                description="Loading current prices and seats."
              />
            ) : tripsQuery.isError && !tripsQuery.data ? (
              <HomeState
                title="Rides are temporarily unavailable"
                description="We couldn’t reach the transport service."
                retry={() => {
                  void tripsQuery.refetch();
                }}
              />
            ) : visibleTrips.length ? (
              <>
                <div className={styles.rideGrid}>
                  {visibleTrips.slice(0, 3).map((trip) => (
                    <HomeRideCard
                      key={trip.id}
                      trip={trip}
                      saved={favorites.saved.has(trip.id)}
                      pending={favorites.pending}
                      onSave={() => favorites.toggle(trip.id)}
                    />
                  ))}
                </div>
                {tripsQuery.isError && (
                  <p className={styles.refreshNotice} role="status">
                    Couldn’t refresh availability. Open a ride to confirm the
                    latest seats.
                  </p>
                )}
              </>
            ) : (
              <HomeState
                title={
                  vehicle
                    ? `No upcoming ${vehicle} rides`
                    : custom && bookingMode === "vehicle"
                      ? "No private charters available"
                      : "New departures are on their way"
                }
                description="Try another vehicle or search a different destination and date."
              />
            )
          ) : isStay ? (
            hotelsQuery.isPending ? (
              <HomeState
                loading
                title="Finding mountain stays…"
                description="Checking the hotel catalog."
              />
            ) : hotelsQuery.isError && !hotelsQuery.data ? (
              <HomeState
                title="Stays are temporarily unavailable"
                description="We couldn’t reach the hotel service."
                retry={() => {
                  void hotelsQuery.refetch();
                }}
              />
            ) : hotelsQuery.data?.length ? (
              <div className={styles.hotelGrid}>
                {hotelsQuery.data.slice(0, 4).map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} />
                ))}
              </div>
            ) : (
              <HomeState
                title="No stays listed yet"
                description="Try a destination search for available hotels."
              />
            )
          ) : catalogQuery.isPending ? (
            <HomeState
              loading
              title="Discovering local services…"
              description="Loading the latest provider listings."
            />
          ) : catalogQuery.isError ? (
            <HomeState
              title="Services are temporarily unavailable"
              description="We couldn’t load this catalog. Please try again."
              retry={() => {
                void catalogQuery.refetch();
              }}
            />
          ) : catalogQuery.data?.length ? (
            <div className={styles.rideGrid}>
              {catalogQuery.data.slice(0, 3).map((listing) => (
                <article className={styles.catalogCard} key={listing.id}>
                  <HomeImage src={listing.image} alt={listing.name} />
                  <div>
                    <p className={styles.eyebrow}>{listing.destination}</p>
                    <h3>
                      {listing.name}
                      {listing.verified && (
                        <BadgeCheck size={17} aria-label="Verified provider" />
                      )}
                    </h3>
                    <p>{listing.details.join(" · ")}</p>
                    <footer>
                      <strong>
                        {listing.price > 0
                          ? `Rs ${listing.price.toLocaleString("en-PK")}`
                          : "Contact for pricing"}
                        <small>{listing.priceUnit}</small>
                      </strong>
                      {mode === "tours" || mode === "guides" || mode === "restaurants" ? (
                        <Link
                          href={`/${mode}/${listing.id}`}
                          className={styles.primary}
                        >
                          View details
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={styles.primary}
                          onClick={() => setModal(listing)}
                        >
                          View details
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <HomeState
              title="No services found"
              description="Search another destination to explore more providers."
            />
          )}
        </section>

        <section id="home-destinations" className={styles.section}>
          <SectionHeading
            eyebrow="NORTHERN ESCAPES"
            title="Popular destinations"
            description="Mountain valleys, memorable journeys, and a little room to explore."
            href="/explore"
            action="Explore all valleys"
          />
          <div className={styles.destinationGrid}>
            {HOME_DESTINATIONS.map((place) => {
              const departures = trips.filter((trip) =>
                trip.to.toLowerCase().includes(place.destination.toLowerCase()),
              );
              const cheapest = [...departures].sort(
                (a, b) => a.price - b.price,
              )[0];
              const price = cheapest?.price;
              return (
                <Link
                  key={place.name}
                  href={rideSearchHref({
                    from: cheapest?.from ?? "Islamabad",
                    to: place.destination,
                    date: cheapest?.date.slice(0, 10) ?? pakistanDate(),
                    passengers: 1,
                  })}
                  className={styles.destination}
                >
                  <HomeImage src={place.image} alt={place.name} />
                  <div>
                    {price && (
                      <span>
                        From Rs {price.toLocaleString("en-PK")} /{" "}
                        {cheapest.bookingMode === "vehicle"
                          ? "vehicle"
                          : "seat"}
                      </span>
                    )}
                    <h3>{place.name}</h3>
                    <p>{place.caption}</p>
                  </div>
                  <ArrowRight size={20} className={styles.destinationArrow} />
                </Link>
              );
            })}
          </div>
        </section>

      </div>
      <button
        className={styles.help}
        type="button"
        onClick={() => setModal("help")}
      >
        <Headphones size={17} />
        Travel help
      </button>
      {modal && (
        <HomeDialog
          title={
            typeof modal === "object"
              ? modal.name
              : modal === "road"
                ? "Before you take the road"
                : modal === "snow"
                  ? "Prepare for the mountain season"
                  : "How can we help?"
          }
          onClose={() => setModal(null)}
        >
          {typeof modal === "object" ? (
            <>
              <HomeImage
                src={modal.image}
                alt={modal.name}
                className={styles.dialogImage}
              />
              <p className={styles.dialogCopy}>{modal.description}</p>
              <p className={styles.dialogCopy}>
                {modal.destination} · {modal.details.join(" · ")}
              </p>
              {modal.price > 0 && (
                <p className={styles.dialogCopy}>
                  <strong>From Rs {modal.price.toLocaleString("en-PK")}</strong>{" "}
                  · {modal.priceUnit}
                </p>
              )}
              {modal.phone && (
                <a
                  className={styles.primary}
                  href={`tel:${modal.phone.replace(/[^+\d]/g, "")}`}
                >
                  Call provider
                </a>
              )}
            </>
          ) : (
            <>
              <p className={styles.dialogCopy}>
                {modal === "road"
                  ? "Mountain road conditions can change quickly. Confirm the route, pickup point, travel time, and road access with your transport provider before departure."
                  : modal === "snow"
                    ? "Check the forecast before traveling, carry warm layers, and confirm road access and vehicle suitability with your provider. BANJARA does not currently publish live weather or road alerts."
                    : "Open your booking to find journey details and provider contact information. You can also explore transport and stays to plan your next trip."}
              </p>
              <Link
                className={styles.primary}
                href={
                  modal === "help"
                    ? "/account/bookings"
                    : "/explore?service=transport"
                }
              >
                {modal === "help" ? "My bookings" : "Browse transport"}
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </HomeDialog>
      )}
    </div>
  );
}
