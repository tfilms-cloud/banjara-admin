"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Hourglass,
  LoaderCircle,
  MapPin,
  Route as RouteIcon,
  Send,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  cancelTrip,
  createTrip,
  getTripForEdit,
  getTripFormData,
  updateTrip,
  type EditableTrip,
  type SavedRoute,
  type TripStop,
  type TripFormData,
} from "@/services/customer/provider-trips.service";
import { StopPicker } from "./stop-picker";
import f from "./trip-form.module.css";

const CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Peshawar",
  "Gilgit",
  "Hunza",
  "Karimabad",
  "Aliabad",
  "Passu",
  "Skardu",
  "Chilas",
  "Naran",
  "Kaghan",
  "Babusar",
  "Fairy Meadows",
  "Astore",
  "Khaplu",
  "Shigar",
  "Nagar",
  "Swat",
  "Murree",
];

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Adds minutes to a local date + time, returning the new date and time. */
function addMinutes(date: string, time: string, minutes: number) {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime()) || !minutes) return null;
  d.setMinutes(d.getMinutes() + minutes);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
const hoursLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};
const sameRoute = (r: SavedRoute, from: string, to: string) =>
  r.from.toLowerCase() === from.trim().toLowerCase() &&
  r.to.toLowerCase() === to.trim().toLowerCase();

/** Create (no tripId) or edit a trip — the same form as the app's "Create trip". */
export function TripForm({ tripId }: { tripId?: string }) {
  const { user } = useCustomerAuth();
  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: user?.role === "provider",
  });
  const form = useQuery({
    queryKey: ["provider", "trip-form"],
    queryFn: getTripFormData,
  });
  const trip = useQuery({
    queryKey: ["provider", "trip", tripId],
    queryFn: () => getTripForEdit(tripId as string),
    enabled: Boolean(tripId),
  });

  if (form.isError || trip.isError) {
    return <p className={f.error}>{(form.error ?? trip.error)?.message}</p>;
  }
  if (
    application.isPending ||
    form.isPending ||
    (tripId && trip.isPending) ||
    !form.data
  ) {
    return (
      <p className={f.loading} role="status">
        <LoaderCircle size={16} className="animate-spin" /> Loading…
      </p>
    );
  }
  return (
    <Form
      key={tripId ?? "new"}
      data={form.data}
      existing={trip.data}
      approved={application.data?.verificationStatus === "approved"}
    />
  );
}

function Form({
  data,
  existing,
  approved,
}: {
  data: TripFormData;
  existing?: EditableTrip;
  approved: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editing = Boolean(existing);
  const firstRoute = data.routes[0];

  const [from, setFrom] = useState(existing?.origin ?? firstRoute?.from ?? "");
  const [to, setTo] = useState(existing?.destination ?? firstRoute?.to ?? "");
  const [date, setDate] = useState(existing?.departureDate ?? "");
  const [time, setTime] = useState(existing?.departureTime ?? "08:00");
  const [arrivalDate, setArrivalDate] = useState(existing?.arrivalDate ?? "");
  const [arrivalTime, setArrivalTime] = useState(existing?.arrivalTime ?? "");
  const [journey, setJourney] = useState<"one_way" | "round_trip">(
    existing?.journeyType ?? "one_way",
  );
  const [returnDate, setReturnDate] = useState(existing?.returnDate ?? "");
  const [returnTime, setReturnTime] = useState(existing?.returnTime ?? "09:00");
  const [mode, setMode] = useState<"seat" | "vehicle">(
    existing?.bookingMode ?? data.defaultBookingMode,
  );
  const [fare, setFare] = useState(
    String(existing?.price || data.defaultFare || ""),
  );
  const [pickups, setPickups] = useState<TripStop[]>(
    existing?.pickupPoints ?? [],
  );
  const [dropoffs, setDropoffs] = useState<TripStop[]>(
    existing?.dropoffPoints ?? [],
  );
  const [note, setNote] = useState(existing?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const route = data.routes.find((r) => sameRoute(r, from, to));
  const autoArrival =
    route?.durationMinutes && date && time
      ? addMinutes(date, time, route.durationMinutes)
      : null;
  const vehicle = data.vehicle;
  // Edits to a published trip are allowed; new trips need an approved vehicle.
  const canPublish = editing || (approved && Boolean(vehicle?.active));
  const cancelled = existing?.status === "cancelled";

  const blocker = !approved
    ? "You can publish trips once BANJARA approves your application."
    : !vehicle
      ? "Register your vehicle before creating trips."
      : !vehicle.active
        ? "Your vehicle is waiting for approval by the BANJARA team. You can publish trips once it’s approved."
        : "";

  const pickRoute = (r: SavedRoute) => {
    setFrom(r.from);
    setTo(r.to);
    if (!pickups.length && r.stops.length)
      setPickups(r.stops.slice(0, 3).map((name) => ({ name })));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (from.trim().length < 2) next.from = "Where does the trip start?";
    if (to.trim().length < 2) next.to = "Where does the trip end?";
    if (
      from.trim() &&
      to.trim() &&
      from.trim().toLowerCase() === to.trim().toLowerCase()
    )
      next.to = "Start and end can’t be the same place";
    if (!date) next.date = "Choose the departure date";
    if (!/^\d{2}:\d{2}$/.test(time)) next.time = "Choose the departure time";
    if (
      date &&
      /^\d{2}:\d{2}$/.test(time) &&
      new Date(`${date}T${time}:00`) <= new Date()
    )
      next.date = "Choose a date and time in the future";
    const amount = Number(fare);
    if (!Number.isFinite(amount) || amount <= 0)
      next.fare = "Enter the fare in rupees";
    if (!autoArrival && (arrivalDate || arrivalTime)) {
      if (!arrivalDate || !arrivalTime)
        next.arrival = "Enter both arrival date and time, or leave both empty";
      else if (
        new Date(`${arrivalDate}T${arrivalTime}:00`) <=
        new Date(`${date}T${time}:00`)
      )
        next.arrival = "Arrival must be after departure";
    }
    if (journey === "round_trip") {
      if (!returnDate || !/^\d{2}:\d{2}$/.test(returnTime))
        next.return = "Choose the return date and time";
      else if (
        new Date(`${returnDate}T${returnTime}:00`) <=
        new Date(`${date}T${time}:00`)
      )
        next.return = "Return must be after departure";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    setError("");
    if (!validate()) {
      setError("Some details need a fix. Check the highlighted fields.");
      return;
    }
    if (!editing && !vehicle) return;
    const arrival =
      autoArrival ??
      (arrivalDate && arrivalTime
        ? { date: arrivalDate, time: arrivalTime }
        : null);
    const payload = {
      routeId: route?.id || undefined,
      origin: from.trim(),
      destination: to.trim(),
      departureDate: date,
      departureTime: time,
      arrivalDate: arrival?.date,
      arrivalTime: arrival?.time,
      // Pinned stops go by id (exact spot); named ones are located by the backend.
      pickupPoints: pickups.map((stop) => stop.id || stop.name),
      dropoffPoints: dropoffs.map((stop) => stop.id || stop.name),
      price: Number(fare),
      description: note.trim() || undefined,
      journeyType: journey,
      returnDate: journey === "round_trip" ? returnDate : undefined,
      returnTime: journey === "round_trip" ? returnTime : undefined,
      bookingMode: mode,
    };
    setSaving(true);
    try {
      if (existing) await updateTrip(existing.id, payload);
      else
        await createTrip({
          ...payload,
          vehicleId: (vehicle as NonNullable<typeof vehicle>).id,
        });
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      router.push("/provider/trips");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t save this trip. Please try again.",
      );
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!existing) return;
    setCancelling(true);
    setError("");
    try {
      await cancelTrip(existing.id);
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      router.push("/provider/trips");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t cancel this trip.",
      );
      setCancelling(false);
    }
  };

  const departs = date && time ? new Date(`${date}T${time}:00`) : null;
  const arrival =
    autoArrival ??
    (arrivalDate && arrivalTime
      ? { date: arrivalDate, time: arrivalTime }
      : null);
  const arrives = arrival
    ? new Date(`${arrival.date}T${arrival.time}:00`)
    : null;
  const show = (d: Date | null) =>
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString("en-PK", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
  const fareNumber = Number(fare);

  const summary = (
    <aside className={f.summary} aria-label="Trip summary">
      <h3>Trip summary</h3>
      <p className={f.summaryRoute}>
        {from.trim() || "From"} <ArrowRight size={14} /> {to.trim() || "To"}
      </p>
      <dl className={f.summaryList}>
        <div>
          <dt>Departs</dt>
          <dd>
            {show(departs) ?? <span className={f.muted}>Choose a date</span>}
          </dd>
        </div>
        <div>
          <dt>Arrives</dt>
          <dd>{show(arrives) ?? <span className={f.muted}>—</span>}</dd>
        </div>
        <div>
          <dt>Journey</dt>
          <dd>{journey === "round_trip" ? "Round trip" : "One way"}</dd>
        </div>
        <div>
          <dt>Booking</dt>
          <dd>{mode === "vehicle" ? "Whole vehicle" : "By seat"}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>{vehicle ? vehicle.seats : "—"}</dd>
        </div>
        <div>
          <dt>{mode === "vehicle" ? "Fare (vehicle)" : "Fare per seat"}</dt>
          <dd>
            {fareNumber > 0 ? (
              `Rs ${fareNumber.toLocaleString("en-PK")}`
            ) : (
              <span className={f.muted}>—</span>
            )}
          </dd>
        </div>
      </dl>
      {mode === "seat" && vehicle && fareNumber > 0 ? (
        <p className={f.summaryTotal}>
          <span>Full trip earns</span>
          <strong>
            Rs {(fareNumber * vehicle.seats).toLocaleString("en-PK")}
          </strong>
        </p>
      ) : null}
      <button
        type="button"
        className={f.primary}
        disabled={saving || !canPublish || cancelled}
        onClick={() => void save()}
      >
        {saving ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : editing ? (
          <Check size={16} />
        ) : (
          <Send size={16} />
        )}
        {saving ? "Saving…" : editing ? "Save changes" : "Publish trip"}
      </button>
      {!canPublish && !editing ? (
        <p className={f.summaryNote}>
          Publishing opens once you and your vehicle are approved.
        </p>
      ) : null}
      {editing && !cancelled ? (
        confirmCancel ? (
          <div className={f.confirm}>
            <span>
              {existing && existing.bookedSeats > 0
                ? `${existing.bookedSeats} seat(s) are booked. Travellers will be told the trip is cancelled.`
                : "Cancel this trip?"}
            </span>
            <div className={f.confirmButtons}>
              <button
                type="button"
                className={f.secondary}
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
              >
                Keep trip
              </button>
              <button
                type="button"
                className={f.danger}
                onClick={() => void cancel()}
                disabled={cancelling}
              >
                {cancelling ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}{" "}
                Yes, cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={f.dangerGhost}
            onClick={() => setConfirmCancel(true)}
          >
            <X size={15} /> Cancel trip
          </button>
        )
      ) : null}
    </aside>
  );

  return (
    <div className={f.layout}>
      <div className={f.page}>
        <Link href="/provider/trips" className={f.back}>
          <ArrowLeft size={15} /> Back to My trips
        </Link>
        <div className={f.headRow}>
          <div>
            <h2 className={f.title}>
              {editing ? "Edit trip" : "Create a trip"}
            </h2>
            <p className={f.sub}>
              {editing
                ? "Changes show to travellers straight away."
                : "Publish a ride on your route. Travellers can book as soon as it’s live."}
            </p>
          </div>
          {vehicle ? (
            <span className={f.vehiclePill}>
              <Users size={14} /> {vehicle.name || "Your vehicle"} ·{" "}
              {vehicle.seats} seats
            </span>
          ) : null}
        </div>

        {cancelled ? (
          <p className={f.notice}>
            This trip is cancelled. Travellers can no longer book it.
          </p>
        ) : null}
        {!editing && blocker ? (
          <p className={f.notice}>
            <Hourglass size={15} /> {blocker}
          </p>
        ) : null}
        {error ? <p className={f.error}>{error}</p> : null}

        {/* 1. Route */}
        <section className={f.card} aria-labelledby="t-route">
          <Head n={1} id="t-route" title="Route" sub="Where you’re driving" />
          {data.routes.length ? (
            <div className={f.chips} role="group" aria-label="Your routes">
              {data.routes.map((r) => {
                const on = sameRoute(r, from, to);
                return (
                  <button
                    key={`${r.from}-${r.to}`}
                    type="button"
                    aria-pressed={on}
                    className={`${f.chip} ${on ? f.chipOn : ""}`}
                    onClick={() => pickRoute(r)}
                  >
                    <RouteIcon size={14} /> {r.from} → {r.to}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className={f.row2}>
            <Field label="From *" error={errors.from} icon={MapPin}>
              <input
                className={f.input}
                list="trip-cities"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="e.g. Islamabad"
              />
            </Field>
            <Field label="To *" error={errors.to} icon={MapPin}>
              <input
                className={f.input}
                list="trip-cities"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. Hunza"
              />
            </Field>
          </div>
          <datalist id="trip-cities">
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </section>

        {/* 2. When */}
        <section className={f.card} aria-labelledby="t-when">
          <Head
            n={2}
            id="t-when"
            title="When"
            sub="Departure in Pakistan time"
          />
          <div className={f.row2}>
            <Field label="Departure date *" error={errors.date}>
              <input
                className={`${f.input} ${f.inputPlain}`}
                type="date"
                min={todayIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Departure time *" error={errors.time}>
              <input
                className={`${f.input} ${f.inputPlain}`}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          </div>
          {autoArrival ? (
            <p className={f.hintBox}>
              <Clock3 size={14} /> Arrives about{" "}
              {hoursLabel(route?.durationMinutes ?? 0)} later —{" "}
              {new Date(
                `${autoArrival.date}T${autoArrival.time}:00`,
              ).toLocaleString("en-PK", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <div className={f.row2}>
              <Field label="Arrival date (optional)">
                <input
                  className={`${f.input} ${f.inputPlain}`}
                  type="date"
                  min={date || todayIso()}
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                />
              </Field>
              <Field label="Arrival time (optional)" error={errors.arrival}>
                <input
                  className={`${f.input} ${f.inputPlain}`}
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                />
              </Field>
            </div>
          )}
          <div className={f.segmented} role="radiogroup" aria-label="Journey">
            {(["one_way", "round_trip"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={journey === value}
                className={journey === value ? f.segOn : ""}
                onClick={() => setJourney(value)}
              >
                {journey === value ? <Check size={14} /> : null}
                {value === "one_way" ? "One way" : "Round trip"}
              </button>
            ))}
          </div>
          {journey === "round_trip" ? (
            <div className={f.row2}>
              <Field label="Return date *" error={errors.return}>
                <input
                  className={`${f.input} ${f.inputPlain}`}
                  type="date"
                  min={date || todayIso()}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Field>
              <Field label="Return time *">
                <input
                  className={`${f.input} ${f.inputPlain}`}
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                />
              </Field>
            </div>
          ) : null}
        </section>

        {/* 3. Booking & fare */}
        <section className={f.card} aria-labelledby="t-fare">
          <Head
            n={3}
            id="t-fare"
            title="Booking & fare"
            sub={
              vehicle
                ? `${vehicle.seats} passenger seats from your vehicle`
                : "How travellers book"
            }
          />
          <div
            className={f.options}
            role="radiogroup"
            aria-label="How travellers book"
          >
            {(
              [
                {
                  value: "seat",
                  label: "By seat",
                  sub: "Each traveller books and pays for their own seat",
                },
                {
                  value: "vehicle",
                  label: "Whole vehicle",
                  sub: "One booking hires the whole vehicle",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                className={`${f.option} ${mode === option.value ? f.optionOn : ""}`}
                onClick={() => setMode(option.value)}
              >
                <span className={f.radio} aria-hidden="true" />
                <span>
                  <strong>{option.label}</strong>
                  <span>{option.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <Field
            label={
              mode === "vehicle"
                ? "Fare for the whole vehicle (Rs) *"
                : "Fare per seat (Rs) *"
            }
            error={errors.fare}
            icon={Wallet}
          >
            <input
              className={f.input}
              inputMode="numeric"
              value={fare}
              onChange={(e) => setFare(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={mode === "vehicle" ? "e.g. 25000" : "e.g. 4500"}
            />
          </Field>
          {mode === "seat" && vehicle && Number(fare) > 0 ? (
            <p className={f.hint}>
              If every seat is booked: Rs{" "}
              {(Number(fare) * vehicle.seats).toLocaleString("en-PK")}
            </p>
          ) : null}
        </section>

        {/* 4. Pickup & drop-off */}
        <section className={f.card} aria-labelledby="t-stops">
          <Head
            n={4}
            id="t-stops"
            title="Pickup & drop-off"
            sub="Where travellers meet you and get off (optional)"
          />
          <StopPicker
            kind="pickup"
            values={pickups}
            onChange={setPickups}
            suggestions={data.pickupSuggestions}
            near={from}
          />
          <StopPicker
            kind="dropoff"
            values={dropoffs}
            onChange={setDropoffs}
            suggestions={data.dropoffSuggestions}
            near={to}
          />
          <Field label="Note for travellers (optional)">
            <input
              className={`${f.input} ${f.inputPlain}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. One stop for lunch at Chilas"
            />
          </Field>
        </section>
      </div>
      {summary}
    </div>
  );
}

function Head({
  n,
  id,
  title,
  sub,
}: {
  n: number;
  id: string;
  title: string;
  sub: string;
}) {
  return (
    <div className={f.sectionHead}>
      <span className={f.sectionNumber}>{n}</span>
      <div>
        <h3 id={id}>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  icon: Icon,
  children,
}: {
  label: string;
  error?: string;
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <label className={f.field}>
      <span className={f.label}>{label}</span>
      <span className={`${f.control} ${error ? f.controlError : ""}`}>
        {Icon ? <Icon size={16} /> : null}
        {children}
      </span>
      {error ? <span className={f.fieldError}>{error}</span> : null}
    </label>
  );
}
