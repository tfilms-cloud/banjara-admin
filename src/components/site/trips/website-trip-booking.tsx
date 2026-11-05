"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  Smartphone,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { authHref } from "@/lib/auth-redirect";
import { useQuery } from "@/lib/live-query";
import { availableTripSeats, tripBaseFare, tripBookingState } from "@/lib/trip-details";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createTransportBooking } from "@/services/customer/booking.service";
import { getTripById } from "@/services/customer/trip.service";
import type { TransportBooking } from "@/types/customer/booking";
import type { TripWithDetails } from "@/types/customer/trip";
import s from "./trip-booking.module.css";

const MAX_SEATS = 10;

function time(value?: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  if (!match) return value || "";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

export function WebsiteTripBooking({
  id,
  initialPassengers,
  initialPickupId,
}: {
  id: string;
  initialPassengers: number;
  initialPickupId: string;
}) {
  const auth = useCustomerAuth();
  const trip = useQuery({
    queryKey: ["customer", "trip", id],
    queryFn: () => getTripById(id),
    staleTime: 0,
  });
  // Kept through sign-in / sign-up so the traveller comes back to the same choice.
  const hereParams = new URLSearchParams({ passengers: String(initialPassengers) });
  if (initialPickupId) hereParams.set("pickupPoint", initialPickupId);
  const here = `/trips/${encodeURIComponent(id)}/book?${hereParams}`;
  const back = (
    <Link href={`/trips/${encodeURIComponent(id)}`} className={s.back}>
      <ArrowLeft size={15} /> Back to trip
    </Link>
  );

  if (auth.loading || trip.isPending) {
    return (
      <Shell>
        {back}
        <p className={s.state} role="status">
          <LoaderCircle size={16} className={s.spin} /> Loading your booking…
        </p>
      </Shell>
    );
  }
  if (trip.isError || !trip.data) {
    return (
      <Shell>
        {back}
        <State title="This trip could not be loaded" body={trip.error?.message ?? "It may have been removed."} />
      </Shell>
    );
  }
  if (!auth.user) {
    return (
      <Shell>
        {back}
        <State title="Sign in to book this ride" body="Your booking, ticket and messages with the driver are kept in your BANJARA account.">
          <Link className={s.primary} href={authHref("/login", here)}>
            Sign in
          </Link>
          <Link className={s.secondary} href={authHref("/register/traveller", here)}>
            Create a traveller account
          </Link>
        </State>
      </Shell>
    );
  }
  if (auth.user.role !== "customer") {
    return (
      <Shell>
        {back}
        <State
          title="Book with a traveller account"
          body="You are signed in as a service provider. Rides are booked from a traveller account, so sign out and use one to book."
        />
      </Shell>
    );
  }
  const state = tripBookingState(trip.data);
  if (!state.canBook) {
    return (
      <Shell>
        {back}
        <State title={state.label} body="This departure can no longer be booked. Look for another ride on the same route." >
          <Link className={s.secondary} href="/explore?service=transport">
            Find another ride
          </Link>
        </State>
      </Shell>
    );
  }
  return (
    <Shell>
      {back}
      <BookingForm
        trip={trip.data}
        initialPassengers={initialPassengers}
        initialPickupId={initialPickupId}
        onSeatTaken={() => void trip.refetch()}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    // The site layout already provides <main>.
    <div className={s.page}>
      <div className={s.container}>{children}</div>
    </div>
  );
}

function State({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <section className={s.stateCard}>
      <h1>{title}</h1>
      <p>{body}</p>
      {children ? <div className={s.stateActions}>{children}</div> : null}
    </section>
  );
}

type Passenger = { name: string; phone: string };

function BookingForm({
  trip,
  initialPassengers,
  initialPickupId,
  onSeatTaken,
}: {
  trip: TripWithDetails;
  initialPassengers: number;
  initialPickupId: string;
  onSeatTaken: () => void;
}) {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const wholeVehicle = trip.bookingMode === "vehicle";
  const free = useMemo(() => availableTripSeats(trip), [trip]);
  const allSeats = useMemo(() => (trip.seatLayout ?? []).map((seat) => seat.seatNumber), [trip]);
  const maxSeats = Math.min(MAX_SEATS, free.length);

  const [seats, setSeats] = useState<string[]>(() =>
    wholeVehicle ? allSeats : free.slice(0, Math.max(1, Math.min(maxSeats, initialPassengers))),
  );
  const [passengers, setPassengers] = useState<Passenger[]>(() => [
    { name: user?.name ?? "", phone: user?.phone ?? "" },
  ]);
  const [pickupId, setPickupId] = useState(
    trip.pickupLocations.some((p) => p.id === initialPickupId) ? initialPickupId : trip.pickupLocations[0]?.id ?? "",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<TransportBooking | null>(null);

  // One named passenger per seat (by seat); the lead traveller only (whole vehicle).
  const passengerRows = wholeVehicle ? 1 : seats.length;
  const rows = Array.from({ length: passengerRows }, (_, i) => passengers[i] ?? { name: "", phone: "" });
  const setRow = (index: number, patch: Partial<Passenger>) =>
    setPassengers((current) => {
      const next = [...current];
      while (next.length <= index) next.push({ name: "", phone: "" });
      next[index] = { ...next[index], ...patch };
      return next;
    });

  const toggleSeat = (seat: string) => {
    setError("");
    setSeats((current) => {
      if (current.includes(seat)) return current.length > 1 ? current.filter((x) => x !== seat) : current;
      if (current.length >= maxSeats) return current;
      return [...current, seat].sort((a, b) => allSeats.indexOf(a) - allSeats.indexOf(b));
    });
  };
  const addSeat = () => {
    const nextFree = free.find((seat) => !seats.includes(seat));
    if (nextFree && seats.length < maxSeats) toggleSeat(nextFree);
  };
  const removeSeat = () => {
    if (seats.length > 1) setSeats((current) => current.slice(0, -1));
  };

  const baseFare = tripBaseFare(trip, seats.length);
  const pickup = trip.pickupLocations.find((p) => p.id === pickupId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const named = rows.map((row) => ({ name: row.name.trim(), phone: row.phone.trim() }));
    const missing = named.findIndex((row) => row.name.length < 2);
    if (missing !== -1) {
      setError(
        wholeVehicle || missing === 0
          ? "Enter the lead traveller’s full name."
          : `Enter the name of the passenger in seat ${seats[missing]}.`,
      );
      return;
    }
    if (!named[0].phone) {
      setError("Add a phone number so your driver can reach you on the day.");
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createTransportBooking({
        tripId: trip.id,
        seats,
        pickupPointId: pickupId || undefined,
        passengerDetails: named[0],
        passengers: named,
        paymentMethod: "cash",
      });
      setBooked(booking);
      void queryClient.invalidateQueries({ queryKey: ["customer"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "We couldn’t book this ride.";
      const status = (reason as { status?: number })?.status;
      if (status === 409) {
        // Someone took a seat first: reload the seat map and let the traveller re-pick.
        setError(`${message} The seat map has been refreshed — please choose again.`);
        onSeatTaken();
        setSeats((current) => (wholeVehicle ? current : current.slice(0, 1)));
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return <Confirmation trip={trip} booking={booked} wholeVehicle={wholeVehicle} />;
  }

  return (
    <form className={s.layout} onSubmit={submit} noValidate>
      <div className={s.main}>
        <header className={s.heading}>
          <p className={s.eyebrow}>Book your ride</p>
          <h1>
            {trip.from} → {trip.to}
          </h1>
          <p className={s.sub}>
            <CalendarClock size={14} /> {formatDate(trip.date)} · {time(trip.departureTime)} ·{" "}
            {trip.vehicleName} · driven by {trip.agency.name}
          </p>
        </header>

        {/* 1 · Seats */}
        <section className={s.card} aria-labelledby="seats-title">
          <h2 id="seats-title">
            <span className={s.step}>1</span> {wholeVehicle ? "Your vehicle" : "Choose your seats"}
          </h2>
          {wholeVehicle ? (
            <p className={s.note}>
              This trip is hired as a <strong>whole vehicle</strong>: all {allSeats.length} seats are yours, for one
              fare.
            </p>
          ) : (
            <>
              <div className={s.counter}>
                <span>
                  {seats.length} {seats.length === 1 ? "seat" : "seats"}
                </span>
                <button type="button" aria-label="One seat fewer" onClick={removeSeat} disabled={seats.length <= 1}>
                  <Minus size={14} />
                </button>
                <button type="button" aria-label="One seat more" onClick={addSeat} disabled={seats.length >= maxSeats}>
                  <Plus size={14} />
                </button>
                <small>Up to {maxSeats} per booking</small>
              </div>
              <div className={s.seatMap} role="group" aria-label="Seat map">
                {(trip.seatLayout ?? []).map((seat) => {
                  const isFree = seat.status === "available";
                  const picked = seats.includes(seat.seatNumber);
                  return (
                    <button
                      type="button"
                      key={seat.seatNumber}
                      className={`${s.seat} ${picked ? s.seatPicked : ""} ${isFree ? "" : s.seatTaken}`}
                      disabled={!isFree}
                      aria-pressed={picked}
                      aria-label={`Seat ${seat.seatNumber}${isFree ? "" : ", taken"}`}
                      onClick={() => toggleSeat(seat.seatNumber)}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
              <ul className={s.legend}>
                <li>
                  <span className={s.seat} aria-hidden /> Free
                </li>
                <li>
                  <span className={`${s.seat} ${s.seatPicked}`} aria-hidden /> Yours
                </li>
                <li>
                  <span className={`${s.seat} ${s.seatTaken}`} aria-hidden /> Taken
                </li>
              </ul>
            </>
          )}
        </section>

        {/* 2 · Passengers */}
        <section className={s.card} aria-labelledby="passengers-title">
          <h2 id="passengers-title">
            <span className={s.step}>2</span> {wholeVehicle ? "Lead traveller" : "Who is travelling"}
          </h2>
          <div className={s.passengers}>
            {rows.map((row, index) => (
              <div key={index} className={s.passenger}>
                <p className={s.passengerLabel}>
                  <UserRound size={14} />{" "}
                  {wholeVehicle ? "Lead traveller" : `Seat ${seats[index]}${index === 0 ? " · you" : ""}`}
                </p>
                <label>
                  Full name
                  <input
                    value={row.name}
                    autoComplete={index === 0 ? "name" : "off"}
                    onChange={(e) => setRow(index, { name: e.target.value })}
                    maxLength={80}
                  />
                </label>
                <label>
                  Phone {index === 0 ? "" : <small>(optional)</small>}
                  <input
                    type="tel"
                    value={row.phone}
                    autoComplete={index === 0 ? "tel" : "off"}
                    placeholder="03XX XXXXXXX"
                    onChange={(e) => setRow(index, { phone: e.target.value })}
                    maxLength={20}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* 3 · Pickup */}
        <section className={s.card} aria-labelledby="pickup-title">
          <h2 id="pickup-title">
            <span className={s.step}>3</span> Pickup point
          </h2>
          {trip.pickupLocations.length ? (
            <div className={s.options}>
              {trip.pickupLocations.map((point) => (
                <label key={point.id} className={`${s.option} ${pickupId === point.id ? s.optionOn : ""}`}>
                  <input
                    type="radio"
                    name="pickup"
                    checked={pickupId === point.id}
                    onChange={() => setPickupId(point.id)}
                  />
                  <MapPin size={16} />
                  <span>
                    <strong>{point.name}</strong>
                    {point.address ? <small>{point.address}</small> : null}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className={s.note}>
              The driver hasn’t listed pickup points for this trip. Agree where to meet in Messages after booking.
            </p>
          )}
        </section>

        {/* 4 · Payment */}
        <section className={s.card} aria-labelledby="payment-title">
          <h2 id="payment-title">
            <span className={s.step}>4</span> How you’ll pay
          </h2>
          <div className={s.options}>
            <label className={`${s.option} ${s.optionOn}`}>
              <input type="radio" name="payment" checked readOnly />
              <Banknote size={16} />
              <span>
                <strong>Cash to the driver</strong>
                <small>Pay on the day of the trip. Your driver records it in BANJARA.</small>
              </span>
            </label>
            {/* Online wallets are waiting on BANJARA’s merchant accounts. */}
            <div className={`${s.option} ${s.optionSoon}`} aria-disabled="true">
              <input type="radio" name="payment" disabled />
              <Smartphone size={16} />
              <span>
                <strong>EasyPaisa</strong>
                <small>Pay online from your EasyPaisa account.</small>
              </span>
              <em>Coming soon</em>
            </div>
            <div className={`${s.option} ${s.optionSoon}`} aria-disabled="true">
              <input type="radio" name="payment" disabled />
              <Wallet size={16} />
              <span>
                <strong>JazzCash</strong>
                <small>Pay online from your JazzCash account.</small>
              </span>
              <em>Coming soon</em>
            </div>
          </div>
        </section>
      </div>

      <aside className={s.summary} aria-label="Booking summary">
        <h2>Summary</h2>
        <dl className={s.facts}>
          <div>
            <dt>
              <Car size={13} /> Ride
            </dt>
            <dd>
              {trip.from} → {trip.to}
            </dd>
          </div>
          <div>
            <dt>
              <Clock3 size={13} /> Departs
            </dt>
            <dd>
              {formatDate(trip.date)}, {time(trip.departureTime)}
            </dd>
          </div>
          <div>
            <dt>
              <Ticket size={13} /> {wholeVehicle ? "Vehicle" : "Seats"}
            </dt>
            <dd>{wholeVehicle ? `Whole vehicle · ${allSeats.length} seats` : seats.join(", ")}</dd>
          </div>
          <div>
            <dt>
              <MapPin size={13} /> Pickup
            </dt>
            <dd>{pickup?.name ?? "Agree with your driver"}</dd>
          </div>
        </dl>
        <div className={s.priceLine}>
          <span>
            {wholeVehicle
              ? "Vehicle fare"
              : `${seats.length} × ${formatCurrency(trip.price, trip.currency)}`}
          </span>
          <strong>{formatCurrency(baseFare, trip.currency)}</strong>
        </div>
        <p className={s.fine}>Tax and BANJARA’s service fee are added to this. You’ll see the exact total right after booking.</p>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={s.primary} disabled={submitting}>
          {submitting ? <LoaderCircle size={16} className={s.spin} /> : null}
          {submitting ? "Booking…" : "Request booking"}
        </button>
        <p className={s.fine}>
          Your driver approves the booking. Nothing is paid now: you pay the driver in cash on the day.
        </p>
      </aside>
    </form>
  );
}

function Confirmation({
  trip,
  booking,
  wholeVehicle,
}: {
  trip: TripWithDetails;
  booking: TransportBooking;
  wholeVehicle: boolean;
}) {
  const messageHref = trip.agency.userId
    ? `/account/messages?with=${encodeURIComponent(trip.agency.userId)}&booking=${encodeURIComponent(booking.id)}`
    : null;
  return (
    <section className={s.done} aria-live="polite">
      <CheckCircle2 size={40} className={s.doneIcon} />
      <p className={s.eyebrow}>Booking {booking.bookingCode}</p>
      <h1>Request sent to {trip.agency.name}</h1>
      <p className={s.sub}>
        {trip.from} → {trip.to} · {formatDate(trip.date)}, {time(trip.departureTime)} ·{" "}
        {wholeVehicle ? "whole vehicle" : `seat ${booking.seats.join(", ")}`}
      </p>
      <ol className={s.next}>
        <li>
          <strong>Waiting for your driver.</strong> You’ll get a notification as soon as they approve.
        </li>
        <li>
          <strong>
            Pay {formatCurrency(booking.totalAmount, booking.currency)} in cash
          </strong>{" "}
          to the driver on the day (fare, tax and service fee included).
        </li>
        <li>
          <strong>Show your ticket</strong> from My bookings when you board.
        </li>
      </ol>
      <div className={s.stateActions}>
        <Link className={s.primary} href={`/account/bookings?booking=${encodeURIComponent(booking.id)}`}>
          <Ticket size={16} /> View my booking
        </Link>
        {messageHref ? (
          <Link className={s.secondary} href={messageHref}>
            <MessageSquare size={16} /> Message the driver
          </Link>
        ) : null}
      </div>
    </section>
  );
}
