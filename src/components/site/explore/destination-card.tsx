"use client";
import { ArrowRight, Heart, MapPin } from "lucide-react";
import type { ExploreDestination } from "@/lib/explore-destinations";
import { destinationInventory } from "@/lib/explore-destinations";
import type { TripWithDetails } from "@/types/customer/trip";
import { HomeImage } from "@/components/site/home/home-primitives";
import styles from "./explore.module.css";

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
  return (
    <article className={styles.destinationCard}>
      <div className={styles.destinationImage}>
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
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className={styles.altitude}>
          <MapPin size={12} />
          {destination.altitude.toLocaleString("en-PK")} m altitude
        </span>
      </div>
      <div className={styles.destinationBody}>
        <h3>{destination.name}</h3>
        <p className={styles.destinationDescription}>
          {destination.description}
        </p>
        <div className={styles.tags}>
          {destination.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <footer>
          <div>
            <small>
              {inventory.cheapest
                ? "Transit links from"
                : "Discover the valley"}
            </small>
            {inventory.cheapest ? (
              <p>
                <strong>
                  Rs {inventory.cheapest.price.toLocaleString("en-PK")}
                </strong>
                <span>
                  {" "}
                  /{" "}
                  {inventory.cheapest.bookingMode === "vehicle"
                    ? "vehicle"
                    : "seat"}
                </span>
              </p>
            ) : (
              <p className={styles.noFare}>Explore routes & stays</p>
            )}
          </div>
          <button type="button" className={styles.primary} onClick={onExplore}>
            Explore
            <ArrowRight size={14} />
          </button>
        </footer>
      </div>
    </article>
  );
}
