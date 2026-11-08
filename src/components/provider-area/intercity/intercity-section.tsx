"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  LoaderCircle,
  MapPinned,
  Play,
  Route,
  Settings,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { classLabel, formatPakistanTime, formatRupees } from "@/lib/intercity";
import { useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getDriverIntercitySettings,
  getDriverRideRequests,
  respondToRideRequest,
  setIntercityTripStatus,
  type DriverRideRequest,
  type DriverUpcomingTrip,
} from "@/services/customer/intercity.service";
import { LocationSharer } from "./location-sharer";
import { CommissionBalance } from "./commission-balance";
import s from "../sections/sections.module.css";
import c from "./intercity.module.css";

export const DRIVER_INTERCITY_SETTINGS_KEY = ["provider", "intercity-settings"];
const REQUESTS_KEY = ["provider", "intercity-requests"];

/** Transport providers only (hosts and other services don't drive). */
export function useIsTransportProvider() {
  const { user } = useCustomerAuth();
  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: user?.role === "provider",
  });
  const services = application.data?.services ?? [];
  return {
    ready: application.isSuccess,
    isTransport: services.includes("transport") && !services.includes("hotel"),
  };
}

function Loading() {
  return (
    <p className={s.loading} role="status">
      <LoaderCircle size={16} className="animate-spin" /> Loading…
    </p>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.empty}>
      <Route size={26} />
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

/** Provider area → City to City: incoming door-to-door requests and the driver's upcoming rides. */
export function IntercitySection() {
  const { ready, isTransport } = useIsTransportProvider();
  const settings = useQuery({
    queryKey: DRIVER_INTERCITY_SETTINGS_KEY,
    queryFn: getDriverIntercitySettings,
    enabled: isTransport,
  });
  const [underway, setUnderway] = useUnderwayTrips();

  let body: ReactNode;
  if (!ready || (isTransport && settings.isPending)) body = <Loading />;
  else if (!isTransport) {
    body = <Message title="For drivers only">City to City rides are driven by transport providers.</Message>;
  } else if (settings.isError || !settings.data) body = <p className={s.error}>{settings.error?.message}</p>;
  else if (!settings.data.featureEnabled) {
    body = <Message title="City to City rides aren’t available yet">We’ll let you know when travellers can request them.</Message>;
  } else body = <Board optedIn={settings.data.enabled} onUnderway={setUnderway} />;

  return (
    <>
      {/* Outside everything that needs live data: when the signal drops, the rest of
          the page goes "unavailable" but location keeps being recorded on the phone. */}
      {underway.map((tripId) => (
        <LocationSharer key={tripId} tripId={tripId} />
      ))}
      {body}
    </>
  );
}

const UNDERWAY_KEY = "banjara:intercity-underway-trips";

/** Trips under way, remembered on the device so a dead zone (or a reload in one) keeps sharing. */
function useUnderwayTrips(): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    // After mount (the server render has no storage), pick up trips saved on this device.
    let list: string[] = [];
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(UNDERWAY_KEY) ?? "[]");
      list = Array.isArray(saved) ? saved.filter((v): v is string => typeof v === "string") : [];
    } catch {
      // Nothing saved or storage blocked.
    }
    if (!list.length) return;
    const timer = window.setTimeout(() => setIds((current) => (current.length ? current : list)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = useCallback((next: string[]) => {
    setIds((current) => (current.join() === next.join() ? current : next));
    try {
      window.localStorage.setItem(UNDERWAY_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: sharing still works while the page stays open.
    }
  }, []);
  return [ids, update];
}

function Board({ optedIn, onUnderway }: { optedIn: boolean; onUnderway: (ids: string[]) => void }) {
  const data = useQuery({ queryKey: REQUESTS_KEY, queryFn: getDriverRideRequests, refetchInterval: 10_000 });
  const requests = data.data?.requests ?? [];
  const upcoming = data.data?.upcoming ?? [];
  const balance = data.data?.balance ?? null;
  // Only a real answer from the server changes which trips share location.
  const underwayIds = data.isSuccess
    ? upcoming.filter((t) => t.status === "departed" || t.status === "inTransit").map((t) => t.tripId).join(",")
    : null;
  useEffect(() => {
    if (underwayIds !== null) onUnderway(underwayIds ? underwayIds.split(",") : []);
  }, [underwayIds, onUnderway]);

  return (
    <div className={s.page}>
      <div className={s.head}>
        <p>Travellers ask for door-to-door rides between cities. Accept the fare, counter it, or let it pass.</p>
        <Link href="/provider/settings" className={s.secondary}>
          <Settings size={15} /> City to City settings
        </Link>
      </div>
      {!optedIn ? (
        <p className={s.notice}>
          <MapPinned size={15} />
          <span>
            You are not receiving City to City requests. Turn them on and choose your home city in{" "}
            <Link href="/provider/settings">Settings</Link>.
          </span>
        </p>
      ) : null}
      {balance?.blocked ? (
        <p className={s.error} role="alert">
          {balance.message ?? "Pay your BANJARA commission to take new City to City rides."}{" "}
          <a href="#commission">See how to pay</a>
        </p>
      ) : null}

      <section className={s.card} aria-labelledby="ic-requests">
        <h3 id="ic-requests" className={s.cardTitle}>
          Requests near you <span className={s.count}>{requests.length}</span>
        </h3>
        {data.isPending ? (
          <Loading />
        ) : data.isError ? (
          <p className={s.error}>{data.error.message}</p>
        ) : requests.length ? (
          <ul className={c.cards}>
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </ul>
        ) : (
          <div className={s.empty}>
            <Inbox size={26} />
            <strong>{balance?.blocked ? "Requests are paused" : "No requests right now"}</strong>
            <span>
              {balance?.blocked
                ? "Pay your BANJARA commission below and new requests start again once it's confirmed."
                : "New requests on your routes appear here. This list refreshes on its own."}
            </span>
          </div>
        )}
      </section>

      <section className={s.card} aria-labelledby="ic-upcoming">
        <h3 id="ic-upcoming" className={s.cardTitle}>
          Your upcoming City to City rides
        </h3>
        {upcoming.length ? (
          <ul className={c.cards}>
            {upcoming.map((trip) => (
              <UpcomingCard key={trip.tripId} trip={trip} />
            ))}
          </ul>
        ) : (
          <p className={c.muted}>When a traveller chooses your offer, the ride appears here.</p>
        )}
      </section>

      <CommissionBalance />
    </div>
  );
}

function RequestCard({ request: r }: { request: DriverRideRequest }) {
  const queryClient = useQueryClient();
  const [countering, setCountering] = useState(false);
  const [amount, setAmount] = useState(String(r.fare));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputId = `counter-${r.id}`;

  const respond = async (action: "accept" | "decline" | "counter") => {
    setError("");
    const value = Math.round(Number(amount));
    if (action === "counter" && !(value > 0)) return setError("Enter your price in whole rupees.");
    setBusy(action);
    try {
      await respondToRideRequest(r.id, action, action === "counter" ? value : undefined);
      setCountering(false);
      await queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t send your answer.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className={c.cardItem}>
      <div className={c.cardTop}>
        <div>
          <strong className={c.route}>{r.route}</strong>
          <span className={c.areas}>
            {r.pickupArea} → {r.dropoffArea}
          </span>
        </div>
        <div className={c.fare}>
          <strong>{formatRupees(r.fare)}</strong>
          <span>{r.fareMode === "bid" ? "Traveller’s offer" : "Fare"}</span>
        </div>
      </div>
      <div className={c.badges}>
        <span className={`${s.badge} ${r.bookNow ? s.badgeAmber : s.badgeTeal}`}>
          <Clock3 size={11} /> {r.bookNow ? "Leave now" : formatPakistanTime(r.departAt)}
        </span>
        {r.journeyType === "round_trip" ? (
          <span className={`${s.badge} ${s.badgeGreen}`}>
            Round trip
            {r.returnTrip
              ? ` · back ${formatPakistanTime(r.returnTrip.departAt)}${
                  r.returnTrip.waitMode === "overnight"
                    ? ` · ${r.returnTrip.nights ?? 1} night(s)`
                    : ` · waits ${r.returnTrip.waitHours ?? 0} h`
                }`
              : ""}
          </span>
        ) : null}
        {r.rideType === "shared_seat" ? <span className={`${s.badge} ${s.badgeAmber}`}>Shared seat</span> : null}
      </div>
      <dl className={c.meta}>
        <div>
          <dt>Vehicle</dt>
          <dd>{classLabel(r.vehicleClass)}</dd>
        </div>
        <div>
          <dt>Passengers</dt>
          <dd>{r.passengers}</dd>
        </div>
        <div>
          <dt>Luggage</dt>
          <dd>
            {r.luggage.bags} {r.luggage.bags === 1 ? "bag" : "bags"}
            {r.luggage.large ? `, ${r.luggage.large} large` : ""}
          </dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>about {Math.round(r.distanceKm)} km</dd>
        </div>
      </dl>
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      {r.myOffer ? (
        <p className={c.sent}>
          <Check size={14} /> Offer sent: {formatRupees(r.myOffer.amount)}
          {r.myOffer.kind === "counter" ? " (counter-offer)" : ""}. Waiting for the traveller to choose.
        </p>
      ) : countering ? (
        <div className={c.counter}>
          <label htmlFor={inputId}>Your price (Rs)</label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={1}
            step={100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="button" className={s.secondary} onClick={() => setCountering(false)} disabled={Boolean(busy)}>
            Back
          </button>
          <button type="button" className={s.primary} onClick={() => void respond("counter")} disabled={Boolean(busy)}>
            {busy === "counter" ? <LoaderCircle size={14} className="animate-spin" /> : null} Send counter-offer
          </button>
        </div>
      ) : (
        <div className={c.actions}>
          <button type="button" className={s.danger} onClick={() => void respond("decline")} disabled={Boolean(busy)}>
            {busy === "decline" ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />} Decline
          </button>
          {r.canCounter ? (
            <button type="button" className={s.secondary} onClick={() => setCountering(true)} disabled={Boolean(busy)}>
              Counter
            </button>
          ) : null}
          <button type="button" className={s.primary} onClick={() => void respond("accept")} disabled={Boolean(busy)}>
            {busy === "accept" ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Accept{" "}
            {formatRupees(r.fare)}
          </button>
        </div>
      )}
    </li>
  );
}

const TRIP_STATUS: Record<string, string> = {
  scheduled: "Scheduled",
  boarding: "Boarding",
  departed: "On the way",
  inTransit: "On the way",
  completed: "Completed",
};

function UpcomingCard({ trip }: { trip: DriverUpcomingTrip }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const underway = trip.status === "departed" || trip.status === "inTransit";
  const canStart = trip.status === "scheduled" || trip.status === "boarding";

  const update = async (status: "departed" | "completed") => {
    setError("");
    setBusy(true);
    try {
      await setIntercityTripStatus(trip.tripId, status);
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t update this trip.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={c.cardItem}>
      <div className={c.cardTop}>
        <div>
          <strong className={c.route}>{trip.route}</strong>
          <span className={c.areas}>
            {formatPakistanTime(trip.departAt)} · {trip.leg === "return" ? "Return leg" : "Outbound"} ·{" "}
            {trip.bookingMode === "vehicle" ? "Whole vehicle" : `${trip.seatsLeft} seats left`}
          </span>
        </div>
        <span className={`${s.badge} ${underway ? s.badgeGreen : s.badgeTeal}`}>{TRIP_STATUS[trip.status] ?? trip.status}</span>
      </div>
      {trip.bookings.length ? (
        <ul className={c.bookings}>
          {trip.bookings.map((booking) => (
            <li key={booking.id}>
              <Link href={`/provider/bookings/${encodeURIComponent(booking.id)}`}>
                Booking {booking.number || booking.id.slice(-6)} · {formatRupees(booking.total)} · {booking.status}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={c.actions}>
        {canStart ? (
          <button type="button" className={s.primary} disabled={busy} onClick={() => void update("departed")}>
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />} Start trip
          </button>
        ) : underway ? (
          <button type="button" className={s.primary} disabled={busy} onClick={() => void update("completed")}>
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCheck size={14} />} Complete trip
          </button>
        ) : null}
      </div>
    </li>
  );
}
