"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Navigation, SignalLow } from "lucide-react";
import { formatPakistanTime, isLocationStale, lastSeenLabel } from "@/lib/intercity";
import { directionsUrl } from "@/lib/map-config";
import { useQuery } from "@/lib/live-query";
import { getTripLocation } from "@/services/customer/intercity.service";
import x from "./intercity.module.css";

const LocationMap = dynamic(() => import("@/components/auth/location-map"), {
  ssr: false,
  loading: () => <div className={x.trackMap} role="status" aria-label="Loading map" />,
});

/**
 * The driver's last known position, refreshed every 10 seconds. Mountain roads drop
 * signal for long stretches, so an old position only reads "last seen" — never cancelled.
 */
export function IntercityTracking({ tripId }: { tripId: string }) {
  const location = useQuery({
    queryKey: ["intercity", "trip-location", tripId],
    queryFn: () => getTripLocation(tripId),
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 10_000),
    retry: false,
  });
  // Re-render each 30 s so "last seen" keeps counting between polls.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const data = location.data;
  const last = data?.lastLocation ?? null;
  const flyTo = last ? { latitude: last.lat, longitude: last.lng, zoom: 14, key: new Date(last.at).getTime() } : null;

  if (location.isPending) return <p className={x.waiting}>Loading the driver’s location…</p>;
  if (location.isError || !data) {
    return <p className={x.waiting}>Live location appears here once your ride is under way.</p>;
  }
  if (data.status === "completed") {
    return (
      <p className={x.trackStatus}>
        <CheckCircle2 size={16} /> This trip is complete.
      </p>
    );
  }
  if (!last) {
    return (
      <p className={x.waiting} role="status">
        <SignalLow size={16} /> Waiting for the driver’s location. It appears once they start the trip.
      </p>
    );
  }

  const stale = isLocationStale(last.at, now);
  return (
    <div className={x.track}>
      <p className={x.trackStatus} role="status" aria-live="polite">
        {stale ? <SignalLow size={16} /> : <span className={x.live} aria-hidden="true" />}
        {stale ? lastSeenLabel(last.at, now) : `Live · updated ${formatPakistanTime(last.at)}`}
      </p>
      {stale ? (
        <p className={x.waiting}>Weak signal on mountain roads is normal. The position updates when the driver is back in coverage.</p>
      ) : null}
      <div className={x.trackMap} aria-hidden="true">
        <LocationMap
          center={{ latitude: last.lat, longitude: last.lng }}
          zoom={14}
          flyTo={flyTo}
          onCenterChange={() => {}}
        />
      </div>
      <a className={x.inline} href={directionsUrl(last.lat, last.lng)} target="_blank" rel="noreferrer">
        <Navigation size={14} /> Open the driver’s position in maps
      </a>
    </div>
  );
}
