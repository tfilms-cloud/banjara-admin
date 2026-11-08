"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BusFront,
  CarFront,
  Compass,
  MapPin,
  Mountain,
  Route,
  Star,
  Users,
  Utensils,
} from "lucide-react";
import { VEHICLE_FILTERS } from "@/lib/explore-catalog";
import type { DiscoverCard } from "@/types/customer/discover";
import type { TripWithDetails } from "@/types/customer/trip";
import styles from "./explore-layout.module.css";

type IconKind = Pick<DiscoverCard, "service" | "category">;

/** The vehicle-type (or service) icon for a listing; a component so it is never created during render. */
export function CardIcon({ kind, size }: { kind: IconKind; size: number }) {
  const props = {
    size,
    "aria-hidden": true as const,
    strokeWidth: size > 20 ? 1.5 : 2,
  };
  if (kind.service !== "transport") {
    switch (kind.service) {
      case "hotels":
        return <BedDouble {...props} />;
      case "tours":
        return <Mountain {...props} />;
      case "guides":
        return <Compass {...props} />;
      default:
        return <Utensils {...props} />;
    }
  }
  return kind.category === "van" ||
    kind.category === "mini_bus" ||
    kind.category === "bus" ? (
    <BusFront {...props} />
  ) : (
    <CarFront {...props} />
  );
}

export const vehicleLabel = (category?: string | null) =>
  VEHICLE_FILTERS.find(
    (option) => option.id === category && option.id !== "all",
  )?.label ?? null;

const pkr = (amount: number) =>
  `PKR ${Math.round(amount).toLocaleString("en-PK")}`;

/** "per vehicle" → "/ whole vehicle", "per night" → "/ night". */
export function unitLabel(unit: string | null | undefined) {
  if (!unit) return "";
  const clean = unit.replace(/^per\s+/i, "").trim();
  return `/ ${clean === "vehicle" ? "whole vehicle" : clean}`;
}

/** "Gilgit → Gilgit" reads like a bug; show it as a local route. */
export function routeText(route: string) {
  const [from, to] = route.split(" → ");
  return from && to && from.trim().toLowerCase() === to.trim().toLowerCase()
    ? `Around ${from}`
    : route;
}

/** The listing's own photo, or a neutral placeholder for its type — never a repeated stock photo. */
export function CardMedia({
  src,
  alt,
  kind,
  label,
  verified,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  kind: IconKind;
  label: string;
  verified: boolean;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const usable = src && failed !== src ? src : null;
  return (
    <div className={styles.media}>
      {usable ? (
        <img
          src={usable}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(usable)}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <CardIcon kind={kind} size={36} />
          {label}
        </div>
      )}
      {verified && (
        <span className={styles.verified}>
          <BadgeCheck size={15} aria-hidden="true" />
          Verified
        </span>
      )}
    </div>
  );
}

function Rating({
  rating,
  reviews,
}: {
  rating: number | null | undefined;
  reviews: number;
}) {
  return rating && rating > 0 ? (
    <span
      className={styles.stars}
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <Star size={13} fill="currentColor" aria-hidden="true" />
      {rating.toFixed(1)}
      {reviews > 0 && <em>({reviews})</em>}
    </span>
  ) : (
    <span className={styles.newTag}>New</span>
  );
}

type Highlight = {
  active?: boolean;
  selected?: boolean;
  onHover?: (on: boolean) => void;
};

/** One card for every Explore listing (vehicles, stays, tours, guides, restaurants). */
export function ListingCard({
  card,
  href,
  trip,
  priority,
  active,
  selected,
  onHover,
}: {
  card: DiscoverCard;
  href: string;
  /** The ride behind a vehicle card, when loaded: seats, trip type and pickup. */
  trip?: TripWithDetails;
  priority?: boolean;
} & Highlight) {
  const transport = card.service === "transport";
  const seats = trip ? trip.vehicleCapacity || trip.totalSeats || null : null;
  const pickup = transport
    ? trip?.pickupLocations?.[0]?.name ||
      trip?.from ||
      card.route?.from.name ||
      card.tags[0]?.split(" → ")[0]
    : card.city;
  const route = transport && card.tags[0] ? routeText(card.tags[0]) : null;
  const tags = transport
    ? [
        trip?.journeyType === "round_trip"
          ? "Round trip"
          : trip
            ? "One way"
            : null,
      ].filter(Boolean)
    : card.tags.slice(0, 2);
  const kind = transport ? vehicleLabel(card.category) : null;
  return (
    <Link
      id={`listing-${card.id}`}
      href={href}
      className={styles.card}
      data-active={active || undefined}
      data-selected={selected || undefined}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      <CardMedia
        src={card.image}
        alt={card.title}
        kind={card}
        label={kind ?? card.title}
        verified={card.verified}
        priority={priority}
      />
      <div className={styles.body}>
        <h3 className={styles.title} title={card.title}>
          {card.title}
        </h3>
        <p className={styles.byline}>
          {card.subtitle && <span>{card.subtitle}</span>}
          {card.subtitle && <span aria-hidden="true">·</span>}
          <Rating rating={card.rating} reviews={card.reviewCount} />
        </p>
        <p className={styles.meta}>
          {transport ? (
            <>
              {seats ? (
                <span>
                  <Users size={14} aria-hidden="true" />
                  {seats} seats
                </span>
              ) : null}
              {kind && (
                <span>
                  <CardIcon kind={card} size={14} />
                  {kind}
                </span>
              )}
              {pickup && (
                <span>
                  <MapPin size={14} aria-hidden="true" />
                  {pickup}
                </span>
              )}
            </>
          ) : (
            card.city && (
              <span>
                <MapPin size={14} aria-hidden="true" />
                {card.city}
              </span>
            )
          )}
        </p>
        {(route || tags.length > 0) && (
          <div className={styles.tagRow}>
            {route && (
              <span className={styles.tag}>
                <Route size={12} aria-hidden="true" />
                {route}
              </span>
            )}
            {tags.map((tag) => (
              <span className={styles.tag} key={tag as string}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className={styles.footer}>
          <div className={styles.price}>
            {card.price && card.price > 0 ? (
              <>
                <strong>{pkr(card.price)}</strong>
                <small>{unitLabel(card.priceUnit)}</small>
              </>
            ) : (
              <span className={styles.noPrice}>
                {card.service === "restaurants"
                  ? "Menu & offers"
                  : "Ask for pricing"}
              </span>
            )}
          </div>
          <span className={styles.cta}>
            View <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export type DriverGroup = {
  providerId: string;
  name: string;
  image: string | null;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  cardIds: string[];
  vehicles: string[];
  routes: string[];
  oneWay: number;
  roundTrip: number;
  fare: { amount: number; unit: string | null } | null;
  category?: string;
};

/** Local drivers, one card per driver, built from the same filtered results as the vehicle grid. */
export function groupDrivers(
  cards: DiscoverCard[],
  trips: Map<string, TripWithDetails>,
): DriverGroup[] {
  const groups = new Map<string, DriverGroup>();
  for (const card of cards) {
    const providerId = card.target.providerId;
    if (!providerId) continue;
    const trip = trips.get(card.id);
    let group = groups.get(providerId);
    if (!group) {
      group = {
        providerId,
        name: card.subtitle || trip?.agency.name || "Local driver",
        image: card.image,
        rating: card.rating,
        reviewCount: card.reviewCount,
        verified: card.verified,
        cardIds: [],
        vehicles: [],
        routes: [],
        oneWay: 0,
        roundTrip: 0,
        fare: null,
        category: card.category,
      };
      groups.set(providerId, group);
    }
    group.cardIds.push(card.id);
    if (!group.image && card.image) group.image = card.image;
    if (!group.vehicles.includes(card.title)) group.vehicles.push(card.title);
    const route = card.tags[0] ? routeText(card.tags[0]) : null;
    if (route && !group.routes.includes(route)) group.routes.push(route);
    if (trip?.journeyType === "round_trip") group.roundTrip++;
    else if (trip) group.oneWay++;
    if (
      card.price &&
      card.price > 0 &&
      (!group.fare || card.price < group.fare.amount)
    ) {
      group.fare = { amount: card.price, unit: card.priceUnit };
    }
  }
  return [...groups.values()];
}

export function DriverCard({
  driver,
  priority,
  active,
  selected,
  onHover,
}: { driver: DriverGroup; priority?: boolean } & Highlight) {
  const trips = [
    driver.oneWay > 0 && "One way",
    driver.roundTrip > 0 && "Round trip",
  ].filter(Boolean) as string[];
  const departures = driver.cardIds.length;
  return (
    <Link
      id={`driver-${driver.providerId}`}
      href={`/agencies/${encodeURIComponent(driver.providerId)}`}
      className={styles.card}
      aria-label={`View driver ${driver.name}`}
      data-active={active || undefined}
      data-selected={selected || undefined}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      <CardMedia
        src={driver.image}
        alt={`${driver.name}'s vehicle`}
        kind={{ service: "transport", category: driver.category }}
        label="Local driver"
        verified={driver.verified}
        priority={priority}
      />
      <div className={styles.body}>
        <h3 className={styles.title} title={driver.name}>
          {driver.name}
        </h3>
        <p className={styles.byline}>
          <Rating rating={driver.rating} reviews={driver.reviewCount} />
          <span aria-hidden="true">·</span>
          <span>
            {departures}{" "}
            {departures === 1 ? "vehicle listed" : "vehicles listed"}
          </span>
        </p>
        <p className={styles.meta}>
          {driver.vehicles[0] && (
            <span>
              <CarFront size={14} aria-hidden="true" />
              {driver.vehicles[0]}
              {driver.vehicles.length > 1
                ? ` +${driver.vehicles.length - 1}`
                : ""}
            </span>
          )}
          {driver.routes[0] && (
            <span>
              <MapPin size={14} aria-hidden="true" />
              {driver.routes[0]}
              {driver.routes.length > 1 ? ` +${driver.routes.length - 1}` : ""}
            </span>
          )}
        </p>
        {trips.length > 0 && (
          <div className={styles.tagRow}>
            {trips.map((t) => (
              <span className={styles.tag} key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className={styles.footer}>
          <div className={styles.price}>
            {driver.fare ? (
              <>
                <strong>From {pkr(driver.fare.amount)}</strong>
                <small>{unitLabel(driver.fare.unit)}</small>
              </>
            ) : (
              <span className={styles.noPrice}>Ask for pricing</span>
            )}
          </div>
          <span className={styles.cta}>
            View <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.media} />
      <div className={styles.body}>
        <div className={styles.skLine} style={{ width: "70%", height: 18 }} />
        <div className={styles.skLine} style={{ width: "50%" }} />
        <div className={styles.skLine} style={{ width: "85%" }} />
        <div className={styles.footer}>
          <div className={styles.skLine} style={{ width: 110, height: 20 }} />
          <div
            className={styles.skLine}
            style={{ width: 84, height: 40, borderRadius: 999, marginTop: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
