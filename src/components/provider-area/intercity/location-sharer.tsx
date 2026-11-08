"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, SignalLow, TriangleAlert } from "lucide-react";
import { createLocationBuffer, type BufferStorage, type LocationBuffer } from "@/lib/location-buffer";
import { sendTripLocations } from "@/services/customer/intercity.service";
import c from "./intercity.module.css";

/** Points per request (the API takes up to 500). */
const BATCH = 500;
/** ~4 hours at one point every 5 s: long Karakoram Highway dead zones fit. */
const MAX_BUFFERED = 3_000;
/** One point every few seconds is plenty for the rider's map and keeps the buffer small. */
const MIN_GAP_MS = 5_000;
const FLUSH_EVERY_MS = 15_000;

function browserStorage(): BufferStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Shares the driver's position while a trip is under way. Every point is kept on
 * the device first and sent when there is signal, so a dead zone delays the rider's
 * map but never loses the trip (and never cancels anything).
 */
export function LocationSharer({ tripId }: { tripId: string }) {
  const [buffer] = useState<LocationBuffer>(() =>
    createLocationBuffer({ storage: browserStorage(), key: `banjara:intercity-locations:${tripId}`, maxPoints: MAX_BUFFERED }),
  );
  const [waiting, setWaiting] = useState(() => buffer.size());
  const [gpsError, setGpsError] = useState("");
  const [offline, setOffline] = useState(false);
  const sending = useRef(false);
  const lastAdded = useRef(0);

  const flush = useCallback(async () => {
    if (sending.current) return;
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    sending.current = true;
    try {
      // Keep sending while full batches remain (after a long dead zone).
      for (;;) {
        const points = buffer.drain(BATCH);
        if (!points.length) break;
        await sendTripLocations(tripId, points);
        buffer.ack(points.length);
        setOffline(false);
        if (points.length < BATCH) break;
      }
    } catch {
      // No signal or the server is busy: the points stay buffered for the next try.
      setOffline(true);
    } finally {
      sending.current = false;
      setWaiting(buffer.size());
    }
  }, [buffer, tripId]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = window.setTimeout(() => setGpsError("This browser can’t share its location."), 0);
      return () => window.clearTimeout(timer);
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setGpsError("");
        if (position.timestamp - lastAdded.current < MIN_GAP_MS) return;
        lastAdded.current = position.timestamp;
        const { latitude, longitude, speed, heading } = position.coords;
        buffer.add({
          lat: latitude,
          lng: longitude,
          at: new Date(position.timestamp).toISOString(),
          ...(speed != null && Number.isFinite(speed) && speed >= 0 && speed <= 100 ? { speed } : {}),
          ...(heading != null && Number.isFinite(heading) && heading >= 0 && heading <= 360 ? { heading } : {}),
        });
        setWaiting(buffer.size());
      },
      (reason) => {
        setGpsError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser so the traveller can follow the trip."
            : "Looking for GPS signal…",
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [buffer]);

  useEffect(() => {
    const run = () => void flush();
    const first = window.setTimeout(run, 0);
    const timer = window.setInterval(run, FLUSH_EVERY_MS);
    window.addEventListener("online", run);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("online", run);
    };
  }, [flush]);

  return (
    <div className={c.sharer} role="status" aria-live="polite">
      <p>
        <LocateFixed size={15} /> Sharing location
        {waiting ? ` · ${waiting} ${waiting === 1 ? "point" : "points"} waiting to send` : " · up to date"}
      </p>
      {gpsError ? (
        <p className={c.warn}>
          <TriangleAlert size={14} /> {gpsError}
        </p>
      ) : null}
      {offline ? (
        <p className={c.muted}>
          <SignalLow size={14} /> Weak signal on mountain roads is normal. Points are saved on this phone and sent when you’re
          back in coverage. Keep this page open.
        </p>
      ) : null}
    </div>
  );
}
