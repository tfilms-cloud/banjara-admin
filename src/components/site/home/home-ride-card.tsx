"use client";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BusFront,
  CarFront,
  Heart,
  MapPin,
  Star,
  Zap,
} from "lucide-react";
import type { TripWithDetails } from "@/types/customer/trip";
import { timeLabel } from "@/lib/home-discovery";
import { formatDuration } from "@/lib/customer-destinations";
import { transportAgencyHref } from "@/lib/agency-discovery";
import { HomeImage } from "./home-primitives";
import styles from "./home.module.css";

/** A trip at a glance: where, when, who, and how much — in that order. */
export function HomeRideCard({
  trip,
  saved,
  pending,
  onSave,
}: {
  trip: TripWithDetails;
  saved: boolean;
  pending: boolean;
  onSave: () => void;
}) {
  const wholeVehicle = trip.bookingMode === "vehicle";
  const VehicleIcon =
    trip.vehicleType === "car" || wholeVehicle ? CarFront : BusFront;
  const lowSeats = !wholeVehicle && trip.availableSeats <= 3;
  const date = new Date(
    `${trip.date.slice(0, 10)}T12:00:00+05:00`,
  ).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });
  const pickup = trip.pickupLocations[0]?.name;
  const hasReviews = trip.agency.reviewCount > 0;
  const agencyHref = transportAgencyHref(trip);

  return (
    <article className={styles.tripCard}>
      <div className={styles.tripMedia}>
        <HomeImage
          src={trip.vehicleImages?.[0] || trip.image}
          alt={`${trip.vehicleName} for ${trip.from} to ${trip.to}`}
        />
        <span
          className={`${styles.tripBadge} ${lowSeats ? styles.tripBadgeWarn : ""}`}
        >
          {lowSeats && <Zap size={12} aria-hidden="true" />}
          {wholeVehicle
            ? `Whole vehicle · up to ${trip.availableSeats}`
            : lowSeats
              ? `Only ${trip.availableSeats} seat${trip.availableSeats === 1 ? "" : "s"} left`
              : `${trip.availableSeats} seats available`}
        </span>
        <button
          type="button"
          className={styles.tripSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${trip.agency.name} ride`}
          aria-pressed={saved}
          disabled={pending}
          onClick={onSave}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className={styles.tripVehicle}>
          <VehicleIcon size={14} aria-hidden="true" />
          {trip.vehicleName}
        </span>
      </div>

      <div className={styles.tripBody}>
        <Link href={`/trips/${trip.id}`} className={styles.tripRoute}>
          <h3>
            {trip.from}
            <ArrowRight size={17} aria-hidden="true" />
            {trip.to}
          </h3>
        </Link>
        <p className={styles.tripWhen}>
          {date}
          {pickup ? (
            <>
              <i aria-hidden="true" />
              <MapPin size={12} aria-hidden="true" />
              {pickup}
            </>
          ) : null}
        </p>

        <div
          className={styles.tripTimes}
          role="group"
          aria-label={`Departs ${timeLabel(trip.departureTime)}, arrives ${timeLabel(trip.arrivalTime)}, ${formatDuration(trip.durationMinutes)}`}
        >
          <strong>{timeLabel(trip.departureTime)}</strong>
          <span className={styles.tripLine}>
            <em>{formatDuration(trip.durationMinutes)}</em>
          </span>
          <strong>{timeLabel(trip.arrivalTime)}</strong>
        </div>

        {trip.amenities.length > 0 && (
          <ul className={styles.tripChips} aria-label="Included">
            {trip.amenities.slice(0, 3).map((amenity) => (
              <li key={amenity}>{amenity}</li>
            ))}
          </ul>
        )}

        <Link href={agencyHref} className={styles.tripProvider}>
          <HomeImage
            src={trip.agency.logo}
            alt=""
            className={styles.tripLogo}
          />
          <span>
            {trip.agency.name}
            {trip.agency.verified && (
              <BadgeCheck size={15} aria-label="Verified provider" />
            )}
          </span>
          <small>
            <Star size={12} fill="currentColor" aria-hidden="true" />
            {hasReviews ? trip.rating.toFixed(1) : "New"}
          </small>
        </Link>
      </div>

      <div className={styles.tripFooter}>
        <div>
          <strong>Rs {trip.price.toLocaleString("en-PK")}</strong>
          <span>{wholeVehicle ? "per vehicle" : "per seat"}</span>
        </div>
        <Link href={`/trips/${trip.id}`} className={styles.primary}>
          Book now
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
