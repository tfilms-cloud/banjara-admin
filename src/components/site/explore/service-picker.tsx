"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CarFront,
  Hotel,
  LoaderCircle,
  LocateFixed,
  MapPinOff,
  MountainSnow,
  Signpost,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { locateVisitor, nearMeHref, type LocateFailure } from "@/lib/near-me";
import type { ExploreService } from "@/lib/explore-catalog";
import styles from "./service-picker.module.css";

const OTHERS: { id: Exclude<ExploreService, "transport">; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "hotels", label: "Stay", hint: "Hotels & guest houses", icon: <Hotel size={22} aria-hidden="true" /> },
  { id: "tours", label: "Tours", hint: "Treks & expeditions", icon: <MountainSnow size={22} aria-hidden="true" /> },
  { id: "guides", label: "Guides", hint: "Local experts", icon: <Signpost size={22} aria-hidden="true" /> },
  { id: "restaurants", label: "Restaurants", hint: "Food & offers", icon: <UtensilsCrossed size={22} aria-hidden="true" /> },
];

type Step = "choose" | "locating" | LocateFailure;

/**
 * "What are you looking for?" — shown when a visitor opens Explore. Choosing Ride asks for
 * their location and opens the map with rides near them; other services open that tab.
 */
export function ServicePicker({
  startWith = "choose",
  onPick,
  onClose,
}: {
  /** "locating" skips the question (the "Rides near me" button). */
  startWith?: "choose" | "locating";
  onPick: (service: ExploreService) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>(startWith);
  const alive = useRef(true);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // Start on the main choice (Ride), not the close button the browser would pick.
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    alive.current = true;
    return () => {
      alive.current = false;
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);

  const findRides = useCallback(() => {
    setStep("locating");
    locateVisitor().then(
      ({ lat, lng }) => {
        if (alive.current) router.push(nearMeHref(lat, lng));
      },
      (failure: LocateFailure) => {
        if (alive.current) setStep(failure);
      },
    );
  }, [router]);

  // Opened from "Rides near me": go straight to locating.
  const started = useRef(false);
  useEffect(() => {
    if (startWith !== "locating" || started.current) return;
    started.current = true;
    const id = requestAnimationFrame(findRides);
    return () => cancelAnimationFrame(id);
  }, [startWith, findRides]);

  const failed = step === "denied" || step === "unavailable" || step === "timeout";

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="service-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>

      {step === "choose" && (
        <>
          <p className={styles.eyebrow}>Welcome to Explore</p>
          <h2 id="service-picker-title" className={styles.title}>
            What are you looking for?
          </h2>
          <p className={styles.lead}>Pick a service and we’ll take you straight there.</p>

          <button type="button" className={styles.ride} onClick={findRides} data-autofocus>
            <span className={styles.rideIcon}>
              <CarFront size={26} aria-hidden="true" />
            </span>
            <span className={styles.rideText}>
              <strong>Ride</strong>
              <small>Find rides with pickups near you</small>
              <em>
                <LocateFixed size={13} aria-hidden="true" />
                Uses your location · within 10 km
              </em>
            </span>
            <ArrowRight size={20} className={styles.rideArrow} aria-hidden="true" />
          </button>

          <div className={styles.grid}>
            {OTHERS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={styles.option}
                onClick={() => onPick(option.id)}
              >
                <span className={styles.optionIcon}>{option.icon}</span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>

          <button type="button" className={styles.skip} onClick={onClose}>
            Just browse everything
          </button>
        </>
      )}

      {step === "locating" && (
        <div className={styles.state} role="status" aria-live="polite">
          <span className={`${styles.stateIcon} ${styles.pulse}`}>
            <LoaderCircle size={30} className={styles.spin} aria-hidden="true" />
          </span>
          <h2 id="service-picker-title" className={styles.title}>
            Finding rides near you…
          </h2>
          <p className={styles.lead}>
            Allow location access when your browser asks. We only use it to show pickups within
            10 km, and we don’t store it.
          </p>
          <button type="button" className={styles.skip} onClick={() => onPick("transport")}>
            Skip and browse all rides
          </button>
        </div>
      )}

      {failed && (
        <div className={styles.state} role="alert">
          <span className={`${styles.stateIcon} ${styles.warn}`}>
            <MapPinOff size={28} aria-hidden="true" />
          </span>
          <h2 id="service-picker-title" className={styles.title}>
            {step === "denied" ? "Location access is off" : "We couldn’t find your location"}
          </h2>
          <p className={styles.lead}>
            {step === "denied"
              ? "To see rides near you, allow location for this site (the icon next to the address bar), then try again."
              : step === "timeout"
                ? "It took too long to get your position. Check that location is on and try again."
                : "Your browser didn’t share a position. You can try again or browse every ride."}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={findRides}>
              <LocateFixed size={17} aria-hidden="true" />
              Try again
            </button>
            <button type="button" className={styles.secondary} onClick={() => onPick("transport")}>
              Browse all rides
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
