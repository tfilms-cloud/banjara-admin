"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BusFront,
  CarFront,
  MapPin,
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
      className={styles.avatar}
      src={src}
      alt={`${name} photo`}
      onError={() => setFailed(src)}
      loading="lazy"
    />
  ) : (
    <span className={styles.logo}>
      <BusFront size={24} />
    </span>
  );
}

/** "Gilgit → Gilgit" reads like a bug to customers; show it as a local route. */
function routeLabel(route: string) {
  const [from, to] = route.split(" → ");
  return from && to && from.trim().toLowerCase() === to.trim().toLowerCase()
    ? `Around ${from}`
    : route;
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
          {groups.every((g) => g.agency.verified) && (
            <BadgeCheck size={13} aria-hidden />
          )}
          {groups.every((g) => g.agency.verified)
            ? "Verified drivers"
            : "Drive with locals"}
        </span>
      </div>
      <div className={styles.grid}>
        {groups.map((group) => {
          const routes = group.routes.map(routeLabel);
          const tripTypes = [
            group.oneWayCount > 0 && `${group.oneWayCount} one way`,
            group.roundTripCount > 0 && `${group.roundTripCount} round trip`,
          ].filter(Boolean);
          const fares = [...group.fares].sort((a, b) =>
            a.unit === b.unit ? 0 : a.unit === "seat" ? -1 : 1,
          );
          return (
            <Link
              key={group.agencyId}
              href={`/agencies/${encodeURIComponent(group.agencyId)}`}
              className={styles.card}
              aria-label={`View driver ${group.agency.name}`}
            >
              <div className={styles.identity}>
                <AgencyLogo name={group.agency.name} src={group.agency.logo} />
                <div>
                  <h3 title={group.agency.name}>
                    <span>{group.agency.name}</span>
                    {group.agency.verified && (
                      <BadgeCheck size={16} aria-label="Verified driver" />
                    )}
                  </h3>
                  <div className={styles.meta}>
                    {group.agency.rating > 0 ? (
                      <span className={styles.rating}>
                        <Star size={12} fill="currentColor" />
                        {group.agency.rating.toFixed(1)}
                        {group.agency.reviewCount > 0 && (
                          <em>({group.agency.reviewCount})</em>
                        )}
                      </span>
                    ) : (
                      <span className={styles.newBadge}>New</span>
                    )}
                    <span aria-hidden>·</span>
                    <span>
                      {group.tripCount}{" "}
                      {group.tripCount === 1 ? "departure" : "departures"}
                    </span>
                  </div>
                </div>
              </div>

              {group.vehicleNames.length > 0 && (
                <div className={styles.vehicles}>
                  {group.vehicleNames.slice(0, 2).map((v) => (
                    <span key={v} title={v}>
                      <CarFront size={13} aria-hidden />
                      <span>{v}</span>
                    </span>
                  ))}
                  {group.vehicleNames.length > 2 && (
                    <span className={styles.more}>
                      +{group.vehicleNames.length - 2}
                    </span>
                  )}
                </div>
              )}

              <ul className={styles.routes} aria-label="Routes">
                {routes.slice(0, 2).map((r) => (
                  <li key={r}>
                    <MapPin size={14} aria-hidden />
                    <span>{r}</span>
                  </li>
                ))}
                {routes.length > 2 && (
                  <li className={styles.moreRoutes}>
                    +{routes.length - 2} more routes
                  </li>
                )}
                {tripTypes.length > 0 && (
                  <li className={styles.tripTypes}>{tripTypes.join(" · ")}</li>
                )}
              </ul>

              <div className={styles.footer}>
                <div
                  className={styles.fares}
                  data-count={Math.min(fares.length, 2)}
                >
                  {fares.slice(0, 2).map((f) => (
                    <div key={`${f.currency}-${f.unit}`}>
                      <small>
                        {f.unit === "seat" ? "Per seat" : "Whole vehicle"}
                      </small>
                      <strong>
                        <em>from</em> {formatCurrency(f.amount, f.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className={styles.cta}>
                  View driver & trips <ArrowRight size={15} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
