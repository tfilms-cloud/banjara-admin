"use client";
import { ArrowRight, Heart, MapPin } from "lucide-react";
import type { ExploreDestination } from "@/lib/explore-destinations";
import { destinationInventory } from "@/lib/explore-destinations";
import type { TripWithDetails } from "@/types/customer/trip";
import { HomeImage } from "@/components/site/home/home-primitives";
import styles from "./explore-layout.module.css";

/** Same card shell as the listings; the footer always has a price block on the left and "Explore" on the right. */
export function DestinationCard({
  destination,
  trips,
  saved,
  savePending,
  onSave,
  onExplore,
}: {
  destination: ExploreDestination;
  trips: TripWithDetails[];
  saved: boolean;
  savePending: boolean;
  onSave: () => void;
  onExplore: () => void;
}) {
  const inventory = destinationInventory(destination, trips);
  const cheapest = inventory.cheapest;
  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <HomeImage src={destination.image} alt={destination.name} />
        <span className={styles.access}>{destination.access}</span>
        <button
          type="button"
          className={styles.save}
          onClick={onSave}
          disabled={savePending}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} ${destination.name} on this device`}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className={styles.altitude}>
          <MapPin size={12} aria-hidden="true" />
          {destination.altitude.toLocaleString("en-PK")} m altitude
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title} title={destination.name}>
          {destination.name}
        </h3>
        <p className={styles.description}>{destination.description}</p>
        <div className={styles.tagRow}>
          {destination.tags.slice(0, 3).map((tag) => (
            <span className={styles.tag} key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className={styles.footer}>
          <div className={styles.price}>
            {cheapest ? (
              <>
                <strong>From PKR {cheapest.price.toLocaleString("en-PK")}</strong>
                <small>/ {cheapest.bookingMode === "vehicle" ? "whole vehicle" : "seat"}</small>
              </>
            ) : (
              <>
                <strong className={styles.noPrice}>Explore routes & stays</strong>
                <small>Rides from nearby cities</small>
              </>
            )}
          </div>
          <button type="button" className={styles.cta} onClick={onExplore}>
            Explore
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
