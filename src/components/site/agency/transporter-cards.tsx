"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BusFront,
  ChevronRight,
  Route,
  Star,
} from "lucide-react";
import { groupTransportAgencies } from "@/lib/agency-discovery";
import { formatCurrency } from "@/lib/utils";
import type { TripWithDetails } from "@/types/customer/trip";
import styles from "./transporter-cards.module.css";

function AgencyLogo({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? (
    <img
      src={src}
      alt={`${name} logo`}
      onError={() => setFailed(src)}
      loading="lazy"
    />
  ) : (
    <span className={styles.logo}>
      <BusFront size={23} />
    </span>
  );
}

/** Same grouped driver entry point as mobile Explore's Local drivers rail. */
export function TransporterCards({ trips }: { trips: TripWithDetails[] }) {
  const groups = groupTransportAgencies(trips);
  if (!groups.length) return null;
  return (
    <section
      className={styles.section}
      aria-labelledby="top-transporters-heading"
    >
      <div className={styles.heading}>
        <div>
          <p>RIDE WITH A LOCAL</p>
          <h2 id="top-transporters-heading">Local drivers</h2>
          <span>
            Every ride is driven by a local driver in their own vehicle. Open a
            driver to see their vehicle, routes and departures.
          </span>
        </div>
        <span className={styles.partners}>
          {groups.every((g) => g.agency.verified)
            ? "Verified drivers"
            : "Drive with locals"}
        </span>
      </div>
      <div className={styles.grid}>
        {groups.map((group) => (
          <Link
            key={group.agencyId}
            href={`/agencies/${encodeURIComponent(group.agencyId)}`}
            className={styles.card}
            aria-label={`View driver ${group.agency.name}`}
          >
            <div className={styles.identity}>
              <AgencyLogo name={group.agency.name} src={group.agency.logo} />
              <div>
                <h3>
                  {group.agency.name}
                  {group.agency.verified && (
                    <BadgeCheck size={16} aria-label="Verified provider" />
                  )}
                </h3>
                <p>
                  {group.vehicleNames.slice(0, 2).join(" · ") ||
                    "Transport partner"}
                </p>
              </div>
              <ChevronRight size={17} />
            </div>
            <div className={styles.summary}>
              <span className={styles.rating}>
                {group.agency.rating > 0 ? (
                  <>
                    <Star size={12} fill="currentColor" />
                    {group.agency.rating.toFixed(1)}
                    {group.agency.reviewCount > 0
                      ? ` (${group.agency.reviewCount})`
                      : ""}
                  </>
                ) : (
                  "New provider"
                )}
              </span>
              <span className={styles.tripCount}>
                {group.tripCount}{" "}
                {group.tripCount === 1 ? "departure" : "departures"}
              </span>
            </div>
            <div className={styles.routes}>
              <Route size={15} />
              <span>
                {group.routes.slice(0, 2).join(" · ")}
                {group.routes.length > 2
                  ? ` +${group.routes.length - 2} more`
                  : ""}
              </span>
            </div>
            <div className={styles.details}>
              <div className={styles.badges}>
                {group.oneWayCount > 0 && (
                  <span>{group.oneWayCount} one way</span>
                )}
                {group.roundTripCount > 0 && (
                  <span>{group.roundTripCount} round trip</span>
                )}
              </div>
              <div className={styles.fares}>
                {group.fares.map((f) => (
                  <div key={`${f.currency}-${f.unit}`}>
                    <small>FROM · PER {f.unit.toUpperCase()}</small>
                    <strong>{formatCurrency(f.amount, f.currency)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.cta}>
              View driver & all trips <ArrowRight size={15} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
