"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Plus,
  Radar,
  Route,
  Star,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { authHref } from "@/lib/auth-redirect";
import { classLabel, formatPakistanTime, formatRupees, requestStatusLabel, shouldSuggestWiden } from "@/lib/intercity";
import { useQuery } from "@/lib/live-query";
import {
  cancelRideRequest,
  chooseOffer,
  getRideRequest,
  intercityConfigQuery,
  joinSharedTrip,
  listRideRequests,
  listSharedTrips,
  widenRideRequest,
  type RideRequest,
} from "@/services/customer/intercity.service";
import { IntercityShell, IntercityState, IntercityUnavailable } from "./intercity-request";
import { IntercityTracking } from "./intercity-tracking";
import s from "../trips/trip-booking.module.css";
import x from "./intercity.module.css";

const requestKey = (id: string) => ["customer", "intercity-request", id];

function statusClass(status: string) {
  if (status === "open") return x.badgeOpen;
  if (status === "matched") return x.badgeDone;
  return x.badgeOff;
}

/** Signed-in traveller with the feature on; otherwise the right message. */
function useGate(next: string) {
  const auth = useCustomerAuth();
  const config = useQuery(intercityConfigQuery);
  if (auth.loading || config.isPending) {
    return (
      <p className={s.state} role="status">
        <LoaderCircle size={16} className={s.spin} /> Loading…
      </p>
    );
  }
  if (config.isError || !config.data) {
    return <IntercityState title="We couldn’t load City to City rides" body={config.error?.message ?? "Please try again."} />;
  }
  if (!config.data.enabled) return <IntercityUnavailable />;
  if (!auth.user) {
    return (
      <IntercityState title="Sign in to see your ride" body="Your City to City requests are kept in your BANJARA account.">
        <Link className={s.primary} href={authHref("/login", next)}>
          Sign in
        </Link>
      </IntercityState>
    );
  }
  return null;
}

/** `/intercity/[id]`: offers come in, the rider chooses one, then follows the driver. */
export function IntercityRequestStatus({ id }: { id: string }) {
  const gate = useGate(`/intercity/${id}`);
  return <IntercityShell>{gate ?? <RequestView id={id} />}</IntercityShell>;
}

function RequestView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const request = useQuery({
    queryKey: requestKey(id),
    queryFn: () => getRideRequest(id),
    refetchInterval: (query) => (query.state.data?.status === "open" ? 5_000 : false),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [widenedAt, setWidenedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (request.isPending) {
    return (
      <p className={s.state} role="status">
        <LoaderCircle size={16} className={s.spin} /> Loading your request…
      </p>
    );
  }
  if (request.isError || !request.data) {
    return <IntercityState title="We couldn’t find this request" body={request.error?.message ?? "It may have been removed."} />;
  }
  const r = request.data;
  const open = r.status === "open";

  const run = async (key: string, task: () => Promise<RideRequest>) => {
    setError("");
    setBusy(key);
    try {
      queryClient.setQueryData(requestKey(id), await task());
      void queryClient.invalidateQueries({ queryKey: ["customer"] });
      setConfirmCancel(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={s.main}>
      <Link href="/account/intercity" className={s.back}>
        <ArrowLeft size={15} /> My City to City rides
      </Link>
      <header className={x.statusHead}>
        <div className={s.heading}>
          <p className={s.eyebrow}>City to City · {r.rideType === "shared_seat" ? "Shared seat" : "Full car"}</p>
          <h1>
            {r.pickup.city || "Pickup"} → {r.dropoff.city || "Drop-off"}
          </h1>
          <p className={s.sub}>
            <CalendarClock size={14} /> {r.bookNow ? "Leave now" : formatPakistanTime(r.departAt)}
            {r.journeyType === "round_trip" && r.returnTrip ? ` · back ${formatPakistanTime(r.returnTrip.departAt)}` : ""}
          </p>
        </div>
        <span className={`${x.badge} ${statusClass(r.status)}`}>{requestStatusLabel(r.status)}</span>
      </header>

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      {r.status === "matched" ? (
        <Matched request={r} />
      ) : open ? (
        <>
          <section className={s.card} aria-labelledby="offers-title">
            <h2 id="offers-title">Driver offers</h2>
            <SearchRadius
              request={r}
              busy={busy === "widen"}
              widenedAt={widenedAt}
              onWiden={() =>
                void run("widen", async () => {
                  const next = await widenRideRequest(r.id);
                  setWidenedAt(new Date().toISOString());
                  return next;
                })
              }
            />
            {r.offers.length ? (
              <ul className={x.list}>
                {r.offers.map((offer) => (
                  <li key={offer.id} className={x.offer}>
                    <div className={x.offerMain}>
                      <strong>
                        {offer.driver?.name ?? "Driver"}{" "}
                        {offer.kind === "counter" ? <span className={x.tag}>Counter-offer</span> : null}
                      </strong>
                      <span className={x.inline}>
                        <Star size={12} fill="currentColor" />
                        {offer.driver && offer.driver.totalReviews > 0
                          ? `${offer.driver.rating.toFixed(1)} (${offer.driver.totalReviews})`
                          : "New driver"}
                        {offer.vehicle ? ` · ${offer.vehicle.name} · ${offer.vehicle.seats} seats` : ""}
                      </span>
                    </div>
                    <span className={x.offerPrice}>{formatRupees(offer.amount)}</span>
                    <button
                      type="button"
                      className={s.primary}
                      disabled={Boolean(busy)}
                      onClick={() => void run(offer.id, () => chooseOffer(r.id, offer.id))}
                      aria-label={`Choose ${offer.driver?.name ?? "this driver"} for ${formatRupees(offer.amount)}`}
                    >
                      {busy === offer.id ? <LoaderCircle size={15} className={s.spin} /> : null}
                      Choose
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={x.waiting} role="status">
                <LoaderCircle size={15} className={s.spin} /> Waiting for drivers to respond. This page updates on its own.
              </p>
            )}
            <p className={s.fine}>
              Prices are before tax and service fee. This request closes at {formatPakistanTime(r.expiresAt)} if no driver is
              chosen.
            </p>
          </section>
          {r.rideType === "shared_seat" ? <SharedTrips request={r} busy={busy} onJoin={(tripId) => void run(tripId, () => joinSharedTrip(r.id, tripId))} /> : null}
        </>
      ) : (
        <IntercityState
          title={r.status === "expired" ? "No driver was chosen in time" : "You cancelled this request"}
          body="You can send a new request whenever you’re ready."
        >
          <Link className={s.primary} href="/intercity">
            <Plus size={16} /> New request
          </Link>
        </IntercityState>
      )}

      <section className={s.card} aria-labelledby="details-title">
        <h2 id="details-title">Your ride</h2>
        <dl className={s.facts}>
          <div>
            <dt>
              <MapPin size={13} /> Pickup
            </dt>
            <dd>{r.pickup.address}</dd>
          </div>
          <div>
            <dt>
              <MapPin size={13} /> Drop-off
            </dt>
            <dd>{r.dropoff.address}</dd>
          </div>
          <div>
            <dt>
              <CarFront size={13} /> Vehicle
            </dt>
            <dd>{classLabel(r.vehicleClass)}</dd>
          </div>
          <div>
            <dt>
              <Users size={13} /> Passengers
            </dt>
            <dd>
              {r.passengers} · {r.luggage.bags} {r.luggage.bags === 1 ? "bag" : "bags"}
              {r.luggage.large ? `, ${r.luggage.large} large` : ""}
            </dd>
          </div>
          <div>
            <dt>
              <Route size={13} /> Distance
            </dt>
            <dd>about {Math.round(r.quote.distanceKm)} km</dd>
          </div>
          {r.riderOffer ? (
            <div>
              <dt>Your offer</dt>
              <dd>{formatRupees(r.riderOffer)}</dd>
            </div>
          ) : null}
          <div>
            <dt>{r.status === "matched" ? "Total (incl. tax & fee)" : "Estimated total"}</dt>
            <dd>{formatRupees(r.estimate.total)}</dd>
          </div>
        </dl>
        <p className={s.fine}>Pay cash to the driver.</p>
        {open ? (
          <div className={x.actionsRow}>
            {confirmCancel ? (
              <>
                <button type="button" className={s.secondary} onClick={() => setConfirmCancel(false)} disabled={Boolean(busy)}>
                  Keep my request
                </button>
                <button
                  type="button"
                  className={s.primary}
                  disabled={Boolean(busy)}
                  onClick={() => void run("cancel", () => cancelRideRequest(r.id))}
                >
                  {busy === "cancel" ? <LoaderCircle size={15} className={s.spin} /> : <X size={15} />} Yes, cancel request
                </button>
              </>
            ) : (
              <button type="button" className={s.secondary} onClick={() => setConfirmCancel(true)}>
                <X size={15} /> Cancel request
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SharedTrips({ request, busy, onJoin }: { request: RideRequest; busy: string | null; onJoin: (tripId: string) => void }) {
  const trips = useQuery({
    queryKey: ["customer", "intercity-shared", request.id],
    queryFn: () => listSharedTrips(request.id),
    refetchInterval: 10_000,
  });
  const list = trips.data ?? [];
  return (
    <section className={s.card} aria-labelledby="shared-title">
      <h2 id="shared-title">Shared rides already going</h2>
      {trips.isPending ? (
        <p className={x.waiting}>
          <LoaderCircle size={15} className={s.spin} /> Looking for shared rides…
        </p>
      ) : list.length ? (
        <ul className={x.list}>
          {list.map((trip) => (
            <li key={trip.tripId} className={x.offer}>
              <div className={x.offerMain}>
                <strong>{trip.route}</strong>
                <span>
                  {formatPakistanTime(trip.departAt)} · {trip.seatsLeft} {trip.seatsLeft === 1 ? "seat" : "seats"} left
                  {trip.driver ? ` · ${trip.driver.name}` : ""}
                  {trip.vehicle ? ` · ${trip.vehicle.name}` : ""}
                </span>
              </div>
              <span className={x.offerPrice}>
                {formatRupees(trip.pricePerSeat)} <small>/ seat</small>
              </span>
              <button
                type="button"
                className={s.primary}
                disabled={Boolean(busy) || trip.seatsLeft < request.passengers}
                onClick={() => onJoin(trip.tripId)}
                aria-label={`Join the ${trip.route} ride at ${formatPakistanTime(trip.departAt)}`}
              >
                {busy === trip.tripId ? <LoaderCircle size={15} className={s.spin} /> : null}
                Join
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={x.waiting}>No shared rides on this route right now. Drivers can still offer you a seat.</p>
      )}
    </section>
  );
}

function Matched({ request }: { request: RideRequest }) {
  return (
    <section className={s.card} aria-labelledby="booked-title">
      <h2 id="booked-title">
        <CheckCircle2 size={18} color="var(--green)" /> Booked
      </h2>
      <p className={s.note}>Your driver is confirmed. Pay them in cash for the ride.</p>
      <div className={x.actionsRow}>
        {request.bookingId ? (
          <Link className={s.primary} href={`/account/bookings?booking=${encodeURIComponent(request.bookingId)}`}>
            <Ticket size={16} /> View my booking
          </Link>
        ) : null}
        {request.returnBookingId ? (
          <Link className={s.secondary} href={`/account/bookings?booking=${encodeURIComponent(request.returnBookingId)}`}>
            <Ticket size={16} /> Return booking
          </Link>
        ) : null}
      </div>
      {request.tripId ? <LegTracking tripId={request.tripId} title="Driver location" /> : null}
      {request.returnTripId ? <LegTracking tripId={request.returnTripId} title="Return trip" /> : null}
    </section>
  );
}

function LegTracking({ tripId, title }: { tripId: string; title: string }) {
  return (
    <div className={x.leg}>
      <h3>{title}</h3>
      <IntercityTracking tripId={tripId} />
    </div>
  );
}

/** "Searching drivers within N km", with a button to step the radius out. */
function SearchRadius({
  request,
  busy,
  widenedAt,
  onWiden,
}: {
  request: RideRequest;
  busy: boolean;
  widenedAt: string | null;
  onWiden: () => void;
}) {
  // Re-check every 15 s so the hint appears without a reload.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const suggest = shouldSuggestWiden({ ...request, lastWidenedAt: widenedAt }, now);
  return (
    <div className={x.searching}>
      <span className={x.inline}>
        <Radar size={15} /> Searching drivers within {request.searchRadiusKm} km
      </span>
      {request.nextRadiusKm != null ? (
        <button type="button" className={suggest ? s.primary : s.secondary} disabled={busy} onClick={onWiden}>
          {busy ? <LoaderCircle size={15} className={s.spin} /> : null}
          Search wider ({request.nextRadiusKm} km)
        </button>
      ) : null}
      {suggest ? (
        <p className={s.fine}>No offers yet. Searching a wider area lets more drivers see your request.</p>
      ) : null}
    </div>
  );
}

/** `/account/intercity`: every City to City request, newest first. */
export function MyRideRequests() {
  const gate = useGate("/account/intercity");
  return <IntercityShell>{gate ?? <RequestList />}</IntercityShell>;
}

function RequestList() {
  const requests = useQuery({ queryKey: ["customer", "intercity-requests"], queryFn: listRideRequests });
  const list = [...(requests.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className={s.main}>
      <header className={x.statusHead}>
        <div className={s.heading}>
          <p className={s.eyebrow}>City to City</p>
          <h1>My ride requests</h1>
        </div>
        <Link className={s.primary} href="/intercity">
          <Plus size={16} /> New request
        </Link>
      </header>
      {requests.isPending ? (
        <p className={s.state} role="status">
          <LoaderCircle size={16} className={s.spin} /> Loading…
        </p>
      ) : requests.isError ? (
        <p className={s.error}>{requests.error.message}</p>
      ) : list.length ? (
        <ul className={x.list}>
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/intercity/${encodeURIComponent(r.id)}`} className={x.offer}>
                <div className={x.offerMain}>
                  <strong>
                    {r.pickup.city || "Pickup"} → {r.dropoff.city || "Drop-off"}
                  </strong>
                  <span>
                    {r.bookNow ? `Requested ${formatPakistanTime(r.createdAt)}` : formatPakistanTime(r.departAt)} ·{" "}
                    {r.rideType === "shared_seat" ? "Shared seat" : classLabel(r.vehicleClass)} · {r.passengers}{" "}
                    {r.passengers === 1 ? "passenger" : "passengers"}
                  </span>
                </div>
                <span className={`${x.badge} ${statusClass(r.status)}`}>{requestStatusLabel(r.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <IntercityState title="No City to City rides yet" body="Request a door-to-door ride between cities and drivers will send you offers." />
      )}
    </div>
  );
}
