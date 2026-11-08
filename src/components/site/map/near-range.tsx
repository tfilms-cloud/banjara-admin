"use client";

import { useState } from "react";
import { LocateFixed, Radar, X } from "lucide-react";
import { NEAR_DEFAULT_KM, NEAR_MAX_KM } from "@/lib/near-me";
import styles from "./near-range.module.css";

/**
 * "Rides near me" search range. When nothing is close, it explains why and lets the visitor
 * widen the circle from 10 km up to 20 km (or drop the distance limit altogether).
 */
export function NearRange({
  radiusKm,
  empty,
  onApply,
  onAllRides,
  onClose,
}: {
  radiusKm: number;
  /** No rides inside the current radius. */
  empty: boolean;
  onApply: (km: number) => void;
  onAllRides: () => void;
  onClose?: () => void;
}) {
  const min = NEAR_DEFAULT_KM;
  const max = NEAR_MAX_KM;
  const [km, setKm] = useState(Math.min(max, Math.max(min, empty && radiusKm < max ? radiusKm + 5 : radiusKm)));
  const atMax = radiusKm >= max;
  const fill = ((km - min) / (max - min)) * 100;

  return (
    <div className={styles.card} role={empty ? "status" : "dialog"} aria-label="Search distance">
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      )}
      <span className={styles.icon} aria-hidden="true">
        {empty ? <Radar size={22} /> : <LocateFixed size={22} />}
      </span>
      <strong className={styles.title}>
        {empty ? `No rides within ${radiusKm} km of you` : "How far will you travel to a pickup?"}
      </strong>
      <p className={styles.text}>
        {empty
          ? atMax
            ? "There are no pickups within 20 km right now. You can still browse every ride across the north."
            : "Widen your search to find pickups a little further away."
          : "We show rides whose pickup point is within this distance of you."}
      </p>

      {!atMax || !empty ? (
        <>
          <div className={styles.valueRow}>
            <span>Search distance</span>
            <output htmlFor="near-range-input" className={styles.value}>
              {km} km
            </output>
          </div>
          <input
            id="near-range-input"
            className={styles.range}
            type="range"
            min={min}
            max={max}
            step={1}
            value={km}
            onChange={(event) => setKm(Number(event.target.value))}
            style={{ "--fill": `${fill}%` } as React.CSSProperties}
            aria-valuetext={`${km} kilometres`}
          />
          <div className={styles.scale} aria-hidden="true">
            <span>{min} km</span>
            <span>15 km</span>
            <span>{max} km</span>
          </div>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onApply(km)}
            disabled={km === radiusKm}
          >
            Show rides within {km} km
          </button>
        </>
      ) : null}
      <button
        type="button"
        // At the widest distance with nothing found, browsing everything is the main way forward.
        className={atMax && empty ? styles.primary : styles.secondary}
        onClick={onAllRides}
      >
        {atMax && empty ? "Browse all rides" : "Browse all rides instead"}
      </button>
    </div>
  );
}
