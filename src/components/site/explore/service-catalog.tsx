"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BusFront,
  BedDouble,
  Mountain,
  Compass,
  Utensils,
  Car,
  Grid2X2,
  UserRound,
  Tent,
  House,
  Route,
  BadgeCheck,
  ArrowRight,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import {
  HomeImage,
  HomeState,
  SectionHeading,
} from "@/components/site/home/home-primitives";
import {
  EXPLORE_SERVICES,
  TOUR_FILTERS,
  type CatalogFilters,
} from "@/lib/explore-catalog";
import { CATEGORY_KEY } from "@/lib/explore-discover";
import type { DiscoverCard, DiscoverResult } from "@/types/customer/discover";
import { ExploreRefineBar } from "./refine-bar";
import styles from "./explore.module.css";

const SERVICE_ICONS = {
  transport: BusFront,
  hotels: BedDouble,
  tours: Mountain,
  guides: Compass,
  restaurants: Utensils,
};
const OPTION_ICONS: Record<string, LucideIcon> = {
  all: Grid2X2,
  car: Car,
  jeep: Car,
  suv: Car,
  van: BusFront,
  mini_bus: BusFront,
  bus: BusFront,
  other: BusFront,
  hotel: BedDouble,
  guest_house: House,
  lodge: Tent,
  trek: Route,
  expedition: Compass,
  summit: Mountain,
  male: UserRound,
  female: UserRound,
};
type Update = (patch: Record<string, string | null>) => void;

export function ExploreServiceSelector({
  filters,
  update,
}: {
  filters: CatalogFilters;
  update: Update;
}) {
  return (
    <nav className={styles.serviceTabs} aria-label="Explore services">
      {EXPLORE_SERVICES.map((service) => {
        const Icon = SERVICE_ICONS[service.id];
        return (
          <button
            type="button"
            key={service.id}
            aria-label={service.title}
            aria-pressed={filters.service === service.id}
            onClick={() =>
              update({
                service: service.id,
                q: null,
                city: null,
                order: null,
                only: null,
              })
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{service.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ExploreDiscoverFilters({
  filters,
  data,
  selectedCategory,
  update,
}: {
  filters: CatalogFilters;
  data?: DiscoverResult;
  /** The category actually in effect (after the empty-category fallback). */
  selectedCategory: string | null;
  update: Update;
}) {
  const service = filters.service;
  return (
    <div className={styles.serviceFilterBar}>
      {service === "restaurants" ? (
        <form
          className={styles.citySearch}
          onSubmit={(event) => {
            event.preventDefault();
            update({
              city: String(
                new FormData(event.currentTarget).get("city") ?? "",
              ).trim(),
            });
          }}
        >
          <MapPin size={18} aria-hidden="true" />
          <input
            key={filters.city}
            name="city"
            aria-label="Restaurant destination"
            placeholder="Hunza, Skardu, Gilgit…"
            defaultValue={filters.city}
            maxLength={100}
          />
          <button className={styles.primary} type="submit">
            Search restaurants
          </button>
          {filters.city && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => update({ city: null })}
            >
              Clear destination
            </button>
          )}
        </form>
      ) : (
        <div
          className={styles.catalogChips}
          role="group"
          aria-label={
            service === "transport"
              ? "Vehicle type"
              : service === "hotels"
                ? "Residence type"
                : service === "guides"
                  ? "Guide gender"
                  : "Tour type"
          }
        >
          {[
            ...(service === "transport"
              ? [{ id: "all", label: "All" }]
              : []),
            ...(data?.options.categories ?? []),
          ].map((option) => {
            const Icon = OPTION_ICONS[option.id] ?? BusFront;
            const selected =
              (selectedCategory ?? (service === "transport" ? "all" : null)) ===
              option.id;
            return (
              <button
                type="button"
                key={option.id}
                aria-pressed={selected}
                onClick={() =>
                  update({
                    [CATEGORY_KEY[service as keyof typeof CATEGORY_KEY]]:
                      option.id,
                  })
                }
              >
                <Icon size={17} aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
      {data && (
        <ExploreRefineBar
          options={data.options}
          applied={data.applied}
          update={update}
        />
      )}
    </div>
  );
}

/** Restaurants with the strongest sales/offers first, as before. */
function rankOffers(cards: DiscoverCard[]) {
  const score = (card: DiscoverCard) =>
    (card.offers ?? []).reduce(
      (sum, o) =>
        sum +
        (o.type === "sale" ? 30 : o.type === "discount" ? 20 : 10) +
        o.discountPercent,
      0,
    );
  return [...cards].sort(
    (a, b) => score(b) - score(a) || (b.rating ?? 0) - (a.rating ?? 0),
  );
}

export function ExploreDiscoverResults({
  filters,
  data,
  loading,
  error,
  retry,
  clear,
  matchesRegion,
}: {
  filters: CatalogFilters;
  data?: DiscoverResult;
  loading: boolean;
  error: boolean;
  retry: () => void;
  clear: () => void;
  matchesRegion: (place: string) => boolean;
}) {
  const service = filters.service;
  const searchParams = useSearchParams();
  const stayParams = new URLSearchParams();
  for (const key of ["checkIn", "checkOut", "adults", "children", "rooms"]) {
    const value = searchParams.get(key);
    if (value) stayParams.set(key, value);
  }
  const hrefFor = (card: DiscoverCard) =>
    service === "transport"
      ? card.target.providerId
        ? `/agencies/${encodeURIComponent(card.target.providerId)}`
        : `/trips/${encodeURIComponent(card.target.id)}`
      : service === "hotels"
        ? `/hotels/${card.id}${stayParams.size ? `?${stayParams}` : ""}`
        : `/${service}/${card.id}`;
  const tiles = (data?.items ?? []).filter((card) => matchesRegion(card.city));
  const offerItems = rankOffers(tiles.filter((card) => card.offers?.length));
  const title =
    service === "transport"
      ? "Popular vehicles"
      : service === "hotels"
        ? "Places to stay"
        : service === "guides"
          ? `Top ${filters.gender} guides`
          : service === "tours"
            ? `${TOUR_FILTERS.find((t) => t.id === filters.tourType)?.label} itineraries`
            : "Most visited restaurants";

  const renderTiles = (items: DiscoverCard[], prefix = "") => (
    <div className={styles.catalogGrid}>
      {items.map((card) => {
        const transport = service === "transport";
        const details =
          prefix === "offer-" && card.offers?.length
            ? [
                ...card.offers.map((offer) =>
                  offer.discountPercent > 0
                    ? `${offer.title} · ${offer.discountPercent}% off`
                    : offer.title,
                ),
                ...card.tags,
              ]
            : service === "guides" && card.languages?.length
              ? [
                  ...card.tags.slice(0, 1),
                  `Languages: ${card.languages.join(", ")}`,
                  ...card.tags.slice(1),
                ]
              : card.tags;
        const content = (
          <>
            <HomeImage src={card.image ?? ""} alt={card.title} />
            <div className={styles.catalogBody}>
              <p>{card.subtitle}</p>
              <h3>
                {card.title}
                {card.verified && (
                  <BadgeCheck size={16} aria-label="Verified provider" />
                )}
              </h3>
              <div className={styles.tags}>
                {details.slice(0, 3).map((detail, i) => (
                  <span key={`${detail}${i}`}>{detail}</span>
                ))}
              </div>
              <footer>
                <div>
                  {card.price && card.price > 0 ? (
                    <>
                      <strong>Rs {card.price.toLocaleString("en-PK")}</strong>
                      <small>{card.priceUnit}</small>
                    </>
                  ) : (
                    <small>
                      {service === "restaurants"
                        ? "Menu & current offers"
                        : "Ask for pricing"}
                    </small>
                  )}
                </div>
                {transport ? (
                  <span className={styles.primary}>
                    View driver <ArrowRight size={15} />
                  </span>
                ) : (
                  <Link className={styles.primary} href={hrefFor(card)}>
                    View details
                    <ArrowRight size={15} />
                  </Link>
                )}
              </footer>
            </div>
          </>
        );
        return transport ? (
          <Link
            className={`${styles.catalogCard} ${styles.transportVehicleCard}`}
            href={hrefFor(card)}
            aria-label={`View ${card.title} at ${card.subtitle}`}
            key={`${prefix}${card.id}`}
          >
            {content}
          </Link>
        ) : (
          <article className={styles.catalogCard} key={`${prefix}${card.id}`}>
            {content}
          </article>
        );
      })}
    </div>
  );

  return (
    <section
      className={styles.serviceResults}
      aria-label="Explore service results"
      aria-live="polite"
    >
      <SectionHeading
        eyebrow="EXPLORE BANJARA"
        title={title}
        description={
          service === "restaurants"
            ? "Traveler favorites ranked by ratings, reviews and menu variety."
            : "Published listings from BANJARA service providers."
        }
      />
      {loading ? (
        <HomeState
          loading
          title="Loading listings…"
          description="Finding published services."
        />
      ) : error ? (
        <HomeState
          title="Listings are temporarily unavailable"
          description="Please try loading this service again."
          retry={retry}
        />
      ) : tiles.length ? (
        <>
          {service === "restaurants" && offerItems.length > 0 && (
            <div className={styles.offerSection}>
              <h3>
                Sales, offers & discounts
                {filters.city ? ` near ${filters.city}` : ""}
              </h3>
              {renderTiles(offerItems, "offer-")}
            </div>
          )}
          <p className={styles.resultCount}>
            {tiles.length} {tiles.length === 1 ? "listing" : "listings"}
          </p>
          {renderTiles(tiles)}
        </>
      ) : (
        <HomeState
          title="No listings match these filters"
          description="Try another category, destination or search."
          retry={clear}
          retryLabel="Reset service filters"
        />
      )}
    </section>
  );
}
