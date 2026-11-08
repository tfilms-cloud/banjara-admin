"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  CarFront,
  Clock3,
  History,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Route,
  Star,
  Users,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { PlaceSearch, describe } from "@/components/auth/driver-location";
import type { DevicePosition, LatLng } from "@/components/auth/location-map";
import { authHref } from "@/lib/auth-redirect";
import { formatDuration } from "@/lib/customer-destinations";
import {
  buildQuoteBody,
  classLabel,
  distanceLabel,
  formatPakistanTime,
  formatRupees,
  fromPakistanInputs,
  minDepartAt,
  nearbyMessage,
  normalizePhone,
  offerFloor,
  toPakistanInputs,
  validateRideForm,
  type FareMode,
  type JourneyType,
  type PlacePoint,
  type RideFormErrors,
  type RideFormValues,
  type RideType,
  type VehicleClassKey,
  type WaitMode,
} from "@/lib/intercity";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-config";
import { keepPreviousData, useQuery } from "@/lib/live-query";
import {
  createRideRequest,
  getIntercityQuote,
  getNearby,
  intercityConfigQuery,
  type EnabledIntercityConfig,
} from "@/services/customer/intercity.service";
import { reverseGeocode, type PlaceResult } from "@/services/customer/provider-application.service";
import s from "../trips/trip-booking.module.css";
import pick from "../../provider-area/trips/stop-picker.module.css";
import x from "./intercity.module.css";

const NearbyMap = dynamic(() => import("./nearby-map"), {
  ssr: false,
  loading: () => <div className={x.nearbyMap} role="status" aria-label="Loading map" />,
});

const LocationMap = dynamic(() => import("@/components/auth/location-map"), {
  ssr: false,
  loading: () => <div className={pick.mapLoading}>Loading map…</div>,
});

export function IntercityShell({ children }: { children: ReactNode }) {
  return (
    // The site layout already provides <main>.
    <div className={s.page}>
      <div className={s.container}>{children}</div>
    </div>
  );
}

export function IntercityState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <section className={s.stateCard}>
      <h1>{title}</h1>
      <p>{body}</p>
      {children ? <div className={s.stateActions}>{children}</div> : null}
    </section>
  );
}

export function IntercityUnavailable() {
  return (
    <IntercityState
      title="City to City rides aren’t available yet"
      body="We’re getting door-to-door rides between cities ready. Until then, you can book seats on published rides."
    >
      <Link className={s.secondary} href="/explore?service=transport">
        Browse rides
      </Link>
    </IntercityState>
  );
}

/** `/intercity`: a door-to-door ride between two cities, priced before it is sent to drivers. */
export function IntercityRequest() {
  const auth = useCustomerAuth();
  const config = useQuery(intercityConfigQuery);

  if (auth.loading || config.isPending) {
    return (
      <IntercityShell>
        <p className={s.state} role="status">
          <LoaderCircle size={16} className={s.spin} /> Loading…
        </p>
      </IntercityShell>
    );
  }
  if (config.isError || !config.data) {
    return (
      <IntercityShell>
        <IntercityState title="We couldn’t load City to City rides" body={config.error?.message ?? "Please try again."} />
      </IntercityShell>
    );
  }
  if (!config.data.enabled) {
    return (
      <IntercityShell>
        <IntercityUnavailable />
      </IntercityShell>
    );
  }
  return (
    <IntercityShell>
      <RideForm config={config.data} />
    </IntercityShell>
  );
}

type Errors = RideFormErrors & { form?: string };

function RideForm({ config }: { config: EnabledIntercityConfig }) {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const [initial] = useState(() => toPakistanInputs(minDepartAt(new Date(), config.minLeadMinutes)));

  const [pickup, setPickup] = useState<PlacePoint | null>(null);
  // The rider's own position (blue dot), once they let the browser share it.
  const [me, setMe] = useState<DevicePosition | null>(null);
  const [autoLocate, setAutoLocate] = useState(false);
  const [dropoff, setDropoff] = useState<PlacePoint | null>(null);
  const [picking, setPicking] = useState<"pickup" | "dropoff" | null>(null);
  const [bookNow, setBookNow] = useState(false);
  const [departDate, setDepartDate] = useState(initial.date);
  const [departTime, setDepartTime] = useState(initial.time);
  const [vehicleClass, setVehicleClass] = useState<VehicleClassKey>(config.classes[0]?.key ?? "car");
  // The nearby search filters by class only once the rider picks one.
  const [classChosen, setClassChosen] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(1);
  const [large, setLarge] = useState(0);
  const [rideType, setRideType] = useState<RideType>("full_car");
  const [journeyType, setJourneyType] = useState<JourneyType>("one_way");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [waitMode, setWaitMode] = useState<WaitMode>("hourly");
  const [waitHours, setWaitHours] = useState(4);
  const [nights, setNights] = useState(1);
  const [fareChoice, setFareChoice] = useState<FareMode>("fixed");
  const [offer, setOffer] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const seats = config.classes.find((c) => c.key === vehicleClass)?.seats ?? 4;
  const shared = rideType === "shared_seat";
  const roundTrip = !shared && journeyType === "round_trip";

  const values: RideFormValues = {
    pickup,
    dropoff,
    bookNow,
    departAt: fromPakistanInputs(departDate, departTime),
    vehicleClass,
    rideType,
    passengers,
    journeyType: roundTrip ? "round_trip" : "one_way",
    returnAt: fromPakistanInputs(returnDate, returnTime),
    waitMode,
    waitHours,
    nights,
    fareMode: "fixed",
    offerAmount: offer.trim() ? Number(offer) : null,
    subtotal: null,
    passengerName: name,
    passengerPhone: phone,
  };

  // Price the ride once the route is complete, half a second after the last change.
  const body = buildQuoteBody(values);
  const bodyKey = body ? JSON.stringify(body) : "";
  const [quoteKey, setQuoteKey] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQuoteKey(bodyKey), 500);
    return () => window.clearTimeout(timer);
  }, [bodyKey]);
  const quote = useQuery({
    queryKey: ["intercity", "quote", quoteKey],
    queryFn: () => getIntercityQuote(JSON.parse(quoteKey)),
    enabled: Boolean(quoteKey),
    retry: false,
    staleTime: 60_000,
  });
  const settled = Boolean(bodyKey) && quoteKey === bodyKey;
  const fare = settled ? quote.data : undefined;
  const fareMode: FareMode = fare?.bidAllowed ? fareChoice : "fixed";
  const floor = fare ? offerFloor(fare.subtotal, config.minOfferPercent) : 0;

  const signInHref = authHref("/login", "/intercity");
  const isProvider = Boolean(user && user.role !== "customer");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      router.push(signInHref);
      return;
    }
    const found: Errors = validateRideForm({ ...values, fareMode, subtotal: fare?.subtotal ?? null }, config);
    if (Object.keys(found).length) {
      setErrors({ ...found, form: "Check the highlighted details." });
      return;
    }
    if (!body || !fare) {
      setErrors({ form: quote.error?.message ?? "Wait for the fare to load, then send your request." });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const created = await createRideRequest({
        ...body,
        bookNow,
        ...(bookNow ? {} : { departAt: values.departAt?.toISOString() }),
        luggage: { bags, large },
        passengerName: name.trim(),
        passengerPhone: normalizePhone(phone),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(fareMode === "bid" ? { offerAmount: Number(offer) } : {}),
      });
      router.push(`/intercity/${encodeURIComponent(created.id)}`);
    } catch (reason) {
      setErrors({ form: reason instanceof Error ? reason.message : "We couldn’t send your request." });
      setSubmitting(false);
    }
  };

  const fieldError = (key: keyof RideFormErrors) =>
    errors[key] ? (
      <small className={x.fieldError} id={`ride-${key}-error`}>
        {errors[key]}
      </small>
    ) : null;
  const describedBy = (key: keyof RideFormErrors) => (errors[key] ? `ride-${key}-error` : undefined);

  return (
    <>
      <div className={x.topLinks}>
        <Link href="/account/intercity" className={s.back}>
          <History size={15} /> My City to City rides
        </Link>
      </div>
      <form className={s.layout} onSubmit={submit} noValidate>
        <div className={s.main}>
          <header className={s.heading}>
            <p className={s.eyebrow}>City to City</p>
            <h1>A ride from your door to theirs</h1>
            <p className={s.sub}>Choose where you’re picked up and dropped off. Drivers between those cities get your request.</p>
          </header>

          <section className={s.card} aria-labelledby="ride-route">
            <h2 id="ride-route">
              <span className={s.step}>1</span> Where
            </h2>
            <div className={x.points}>
              <PointField
                label="Pickup"
                value={pickup}
                error={errors.pickup}
                onOpen={() => setPicking("pickup")}
                onClear={() => setPickup(null)}
                onUseMyLocation={() => {
                  setAutoLocate(true);
                  setPicking("pickup");
                }}
              />
              <PointField
                label="Drop-off"
                value={dropoff}
                error={errors.dropoff}
                drop
                onOpen={() => setPicking("dropoff")}
                onClear={() => setDropoff(null)}
              />
            </div>
            {fare ? (
              <p className={x.detected}>
                <Route size={14} /> {fare.fromCity.name} → {fare.toCity.name} · about {Math.round(fare.distanceKm)} km ·{" "}
                {formatDuration(fare.durationMinutes)}
              </p>
            ) : null}
            {pickup ? <NearbyPanel pickup={pickup} me={me} vehicleClass={classChosen ? vehicleClass : undefined} /> : null}
          </section>

          <section className={s.card} aria-labelledby="ride-when">
            <h2 id="ride-when">
              <span className={s.step}>2</span> When
            </h2>
            <div className={x.choiceRow} role="radiogroup" aria-label="When to leave">
              <Choice name="when" checked={bookNow} onSelect={() => setBookNow(true)} icon={Clock3} title="Leave now" hint="The first driver to accept comes to you." />
              <Choice name="when" checked={!bookNow} onSelect={() => setBookNow(false)} icon={CalendarClock} title="Schedule" hint={`At least ${config.minLeadMinutes} minutes ahead.`} />
            </div>
            {!bookNow ? (
              <div className={x.fields}>
                <label>
                  Date
                  <input type="date" value={departDate} min={initial.date} onChange={(e) => setDepartDate(e.target.value)} aria-describedby={describedBy("departAt")} />
                </label>
                <label>
                  Time (Pakistan)
                  <input type="time" value={departTime} step={300} onChange={(e) => setDepartTime(e.target.value)} aria-describedby={describedBy("departAt")} />
                </label>
                {fieldError("departAt")}
              </div>
            ) : null}
          </section>

          <section className={s.card} aria-labelledby="ride-who">
            <h2 id="ride-who">
              <span className={s.step}>3</span> Vehicle & passengers
            </h2>
            <div className={x.choiceRow} role="radiogroup" aria-label="Ride type">
              <Choice name="rideType" checked={!shared} onSelect={() => setRideType("full_car")} icon={CarFront} title="Full car" hint="The whole vehicle, just for you." />
              <Choice
                name="rideType"
                checked={shared}
                onSelect={() => {
                  setRideType("shared_seat");
                  setJourneyType("one_way");
                }}
                icon={Users}
                title="Shared seat"
                hint="Pay per seat and share the ride. One-way only."
              />
            </div>
            {fieldError("rideType")}
            <div className={x.fields}>
              <label>
                Vehicle
                <select
                  value={vehicleClass}
                  onChange={(e) => {
                    const next = e.target.value as VehicleClassKey;
                    setVehicleClass(next);
                    setClassChosen(true);
                    const max = config.classes.find((c) => c.key === next)?.seats ?? 1;
                    setPassengers((count) => Math.min(count, max));
                  }}
                >
                  {config.classes.map((c) => (
                    <option key={c.key} value={c.key}>
                      {classLabel(c.key)} · up to {c.seats}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Passengers
                <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} aria-describedby={describedBy("passengers")}>
                  {Array.from({ length: seats }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              {fieldError("passengers")}
              <label>
                Bags
                <input type="number" inputMode="numeric" min={0} max={20} value={bags} onChange={(e) => setBags(clamp(e.target.value, 0, 20))} />
              </label>
              <label>
                Large items <small>(suitcases, boxes)</small>
                <input type="number" inputMode="numeric" min={0} max={10} value={large} onChange={(e) => setLarge(clamp(e.target.value, 0, 10))} />
              </label>
            </div>
          </section>

          <section className={s.card} aria-labelledby="ride-journey">
            <h2 id="ride-journey">
              <span className={s.step}>4</span> One way or return
            </h2>
            <div className={x.choiceRow} role="radiogroup" aria-label="Journey">
              <Choice name="journey" checked={!roundTrip} onSelect={() => setJourneyType("one_way")} icon={ArrowRight} title="One way" hint="Drop me off." />
              <Choice
                name="journey"
                checked={roundTrip}
                disabled={shared}
                onSelect={() => setJourneyType("round_trip")}
                icon={Route}
                title="Round trip"
                hint={shared ? "Not available for shared seats." : "The same driver brings you back."}
              />
            </div>
            {roundTrip ? (
              <>
                <div className={x.fields}>
                  <label>
                    Return date
                    <input type="date" value={returnDate} min={bookNow ? initial.date : departDate} onChange={(e) => setReturnDate(e.target.value)} aria-describedby={describedBy("returnAt")} />
                  </label>
                  <label>
                    Return time (Pakistan)
                    <input type="time" value={returnTime} step={300} onChange={(e) => setReturnTime(e.target.value)} aria-describedby={describedBy("returnAt")} />
                  </label>
                  {fieldError("returnAt")}
                </div>
                <div className={x.choiceRow} role="radiogroup" aria-label="While you are there">
                  <Choice
                    name="wait"
                    checked={waitMode === "hourly"}
                    onSelect={() => setWaitMode("hourly")}
                    icon={Clock3}
                    title="Driver waits"
                    hint={`${formatRupees(config.waitingPerHour)} per hour of waiting.`}
                  />
                  <Choice
                    name="wait"
                    checked={waitMode === "overnight"}
                    onSelect={() => setWaitMode("overnight")}
                    icon={CalendarClock}
                    title="Driver stays overnight"
                    hint={`${formatRupees(config.overnightCharge)} per night.`}
                  />
                </div>
                <div className={x.fields}>
                  {waitMode === "hourly" ? (
                    <label>
                      Hours the driver waits
                      <input type="number" inputMode="numeric" min={1} max={72} value={waitHours} onChange={(e) => setWaitHours(clamp(e.target.value, 0, 72))} aria-describedby={describedBy("waitHours")} />
                    </label>
                  ) : (
                    <label>
                      Nights the driver stays
                      <input type="number" inputMode="numeric" min={1} max={14} value={nights} onChange={(e) => setNights(clamp(e.target.value, 0, 14))} aria-describedby={describedBy("nights")} />
                    </label>
                  )}
                  {fieldError(waitMode === "hourly" ? "waitHours" : "nights")}
                </div>
              </>
            ) : null}
          </section>

          <section className={s.card} aria-labelledby="ride-passenger">
            <h2 id="ride-passenger">
              <span className={s.step}>5</span> Who is travelling
            </h2>
            <div className={x.fields}>
              <label>
                Passenger name
                <input value={name} autoComplete="name" maxLength={100} onChange={(e) => setName(e.target.value)} aria-describedby={describedBy("passengerName")} />
              </label>
              <label>
                Phone the driver can call
                <input type="tel" value={phone} autoComplete="tel" placeholder="03XX XXXXXXX" maxLength={20} onChange={(e) => setPhone(e.target.value)} aria-describedby={describedBy("passengerPhone")} />
              </label>
              {fieldError("passengerName")}
              {fieldError("passengerPhone")}
              <label className={x.wide}>
                Note for the driver <small>(optional)</small>
                <input value={notes} maxLength={500} placeholder="Gate colour, nearby landmark…" onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        <aside className={s.summary} aria-label="Fare">
          <h2>Your fare</h2>
          {!body ? (
            <p className={s.fine}>Choose your pickup and drop-off{roundTrip ? ", and when you come back," : ""} to see the fare.</p>
          ) : !settled || quote.isFetching ? (
            <p className={s.state} role="status">
              <LoaderCircle size={15} className={s.spin} /> Working out the fare…
            </p>
          ) : quote.isError || !fare ? (
            <p className={s.error} role="alert">
              {quote.error?.message ?? "We couldn’t price this ride."}
            </p>
          ) : (
            <>
              <dl className={s.facts}>
                {fare.lines.map((line) => (
                  <div key={line.code}>
                    <dt>{line.label}</dt>
                    <dd>{formatRupees(line.amount)}</dd>
                  </div>
                ))}
                <div>
                  <dt>Tax</dt>
                  <dd>{formatRupees(fare.tax)}</dd>
                </div>
                <div>
                  <dt>Service fee</dt>
                  <dd>{formatRupees(fare.serviceFee)}</dd>
                </div>
              </dl>
              <div className={s.priceLine}>
                <span>Total</span>
                <strong>{formatRupees(fare.total)}</strong>
              </div>
              {fare.bidAllowed ? (
                <div className={s.options} role="radiogroup" aria-label="Fare">
                  <Choice name="fare" checked={fareMode === "fixed"} onSelect={() => setFareChoice("fixed")} icon={Check} title="Request at this fare" hint="Drivers accept this price." />
                  <Choice name="fare" checked={fareMode === "bid"} onSelect={() => setFareChoice("bid")} icon={Banknote} title="Offer your own price" hint={`At least ${formatRupees(floor)} before tax and fee.`} />
                </div>
              ) : null}
              {fareMode === "bid" ? (
                <div className={x.fields}>
                  <label className={x.wide}>
                    Your offer (Rs, before tax and fee)
                    <input
                      type="number"
                      inputMode="numeric"
                      min={floor}
                      step={100}
                      value={offer}
                      placeholder={String(fare.subtotal)}
                      onChange={(e) => setOffer(e.target.value)}
                      aria-describedby={describedBy("offerAmount")}
                    />
                  </label>
                  {fieldError("offerAmount")}
                </div>
              ) : null}
            </>
          )}
          <p className={x.cash}>
            <Banknote size={15} /> Pay cash to the driver. Nothing is paid now.
          </p>
          {errors.form ? (
            <p className={s.error} role="alert">
              {errors.form}
            </p>
          ) : null}
          {isProvider ? (
            <p className={s.fine}>You are signed in as a service provider. Rides are requested from a traveller account.</p>
          ) : null}
          <button type="submit" className={s.primary} disabled={submitting || isProvider}>
            {submitting ? <LoaderCircle size={16} className={s.spin} /> : null}
            {submitting ? "Sending…" : !user ? "Sign in to request" : fareMode === "bid" ? "Send my offer" : "Request at this fare"}
          </button>
          <p className={s.fine}>Free cancellation until {config.freeCancelMinutes} minutes before departure.</p>
        </aside>
      </form>
      {picking ? (
        <PlaceDialog
          kind={picking}
          initial={picking === "pickup" ? pickup : dropoff}
          autoLocate={autoLocate}
          me={me}
          onDevicePosition={setMe}
          onClose={() => {
            setPicking(null);
            setAutoLocate(false);
          }}
          onConfirm={(place) => {
            if (picking === "pickup") setPickup(place);
            else setDropoff(place);
            setPicking(null);
            setAutoLocate(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Drivers and listed rides around the pickup; the radius steps out 10 → 20 → 30 → 50 km. */
function NearbyPanel({
  pickup,
  me,
  vehicleClass,
}: {
  pickup: PlacePoint;
  me: DevicePosition | null;
  vehicleClass?: VehicleClassKey;
}) {
  const where = `${pickup.lat},${pickup.lng},${vehicleClass ?? ""}`;
  // A chip choice applies to this pickup and class only; a new pickup searches automatically again.
  const [chosen, setChosen] = useState<{ where: string; radiusKm: number } | null>(null);
  const radiusKm = chosen?.where === where ? chosen.radiusKm : undefined;
  const nearby = useQuery({
    queryKey: ["intercity", "nearby", pickup.lat, pickup.lng, vehicleClass ?? "any", radiusKm ?? "auto"],
    queryFn: () => getNearby({ lat: pickup.lat, lng: pickup.lng, vehicleClass, radiusKm }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = nearby.data;
  const found = data ? data.drivers.length + data.rides.length : 0;
  const message = data ? nearbyMessage({ ...data, found }) : null;

  return (
    <section className={x.nearby} aria-labelledby="nearby-title">
      <div className={x.nearbyHead}>
        <h3 id="nearby-title">Rides near your pickup</h3>
        {data?.steps.length ? (
          <div className={x.chips} role="group" aria-label="Search radius">
            {data.steps.map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={data.radiusKm === step}
                className={`${x.chip} ${data.radiusKm === step ? x.chipOn : ""}`}
                onClick={() => setChosen({ where, radiusKm: step })}
              >
                {step} km
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {nearby.isPending ? (
        <p className={x.waiting} role="status">
          <LoaderCircle size={15} className={s.spin} /> Looking around your pickup…
        </p>
      ) : nearby.isError || !data ? (
        <p className={x.waiting}>{nearby.error?.message ?? "We couldn’t look for rides nearby."}</p>
      ) : (
        <>
          {message ? (
            <p className={x.nearbyNote} role="status">
              {message}
            </p>
          ) : null}
          <NearbyMap pickup={pickup} me={me} radiusKm={data.radiusKm} drivers={data.drivers} rides={data.rides} />
          {data.drivers.length ? (
            <>
              <h4 className={x.nearbySub}>Drivers</h4>
              <ul className={x.list}>
                {data.drivers.map((driver) => (
                  <li key={driver.providerId} className={x.offer}>
                    <div className={x.offerMain}>
                      <strong>{driver.name}</strong>
                      <span className={x.inline}>
                        <Star size={12} fill="currentColor" />
                        {driver.totalReviews > 0 ? `${driver.rating.toFixed(1)} (${driver.totalReviews})` : "New driver"}
                        {driver.vehicles.length
                          ? ` · ${driver.vehicles.map((v) => `${classLabel(v.class)} · ${v.seats} seats`).join(", ")}`
                          : ""}
                      </span>
                    </div>
                    <span className={x.distance}>{distanceLabel(driver.distanceKm)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {data.rides.length ? (
            <>
              <h4 className={x.nearbySub}>Listed rides</h4>
              <ul className={x.list}>
                {data.rides.map((ride) => {
                  const when = formatPakistanTime(fromPakistanInputs(ride.departureDate.slice(0, 10), ride.departureTime.slice(0, 5)));
                  const linked = ride.rideType === "scheduled" || ride.bookingMode === "seat";
                  const body = (
                    <>
                      <div className={x.offerMain}>
                        <strong>{ride.route}</strong>
                        <span>
                          {when || ride.departureDate} · {ride.seatsLeft} {ride.seatsLeft === 1 ? "seat" : "seats"} left · boards at{" "}
                          {ride.boardAt}, {Math.round(ride.distanceKm * 10) / 10} km
                        </span>
                      </div>
                      <span className={x.offerPrice}>
                        {formatRupees(ride.price)} <small>{ride.bookingMode === "vehicle" ? "/ vehicle" : "/ seat"}</small>
                      </span>
                    </>
                  );
                  return (
                    <li key={ride.tripId}>
                      {linked ? (
                        <Link href={`/trips/${encodeURIComponent(ride.tripId)}`} className={x.offer}>
                          {body}
                        </Link>
                      ) : (
                        <div className={x.offer}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function clamp(raw: string, min: number, max: number) {
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function Choice({
  name,
  checked,
  disabled = false,
  onSelect,
  icon: Icon,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: typeof Clock3;
  title: string;
  hint: string;
}) {
  return (
    <label className={`${s.option} ${checked ? s.optionOn : ""} ${disabled ? s.optionSoon : ""}`}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} />
      <Icon size={16} />
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

function PointField({
  label,
  value,
  error,
  drop = false,
  onOpen,
  onClear,
  onUseMyLocation,
}: {
  label: string;
  value: PlacePoint | null;
  error?: string;
  drop?: boolean;
  onOpen: () => void;
  onClear: () => void;
  /** Pickup only: start from where the rider is now. */
  onUseMyLocation?: () => void;
}) {
  return (
    <div className={x.point}>
      <span className={pick.label}>{label}</span>
      {value ? (
        <div className={x.pointChosen}>
          <span className={`${pick.stopIcon} ${drop ? pick.dropIcon : ""}`}>
            <MapPin size={14} />
          </span>
          <span className={pick.stopText}>
            <strong>{value.address}</strong>
            <small>
              {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
            </small>
          </span>
          <button type="button" className={x.linkButton} onClick={onOpen}>
            Change
          </button>
          <button type="button" className={pick.remove} onClick={onClear} aria-label={`Clear ${label.toLowerCase()}`}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <button type="button" className={pick.open} onClick={onOpen}>
          <MapPin size={15} />
          <span>Search or pin your {label.toLowerCase()} on the map</span>
        </button>
      )}
      {!value && onUseMyLocation ? (
        <button type="button" className={x.useMe} onClick={onUseMyLocation}>
          <LocateFixed size={14} /> Use my current location
        </button>
      ) : null}
      {error ? <small className={x.fieldError}>{error}</small> : null}
    </div>
  );
}

/** Search for a place or move the map under the pin; the address can be edited. */
function PlaceDialog({
  kind,
  initial,
  autoLocate = false,
  me,
  onDevicePosition,
  onClose,
  onConfirm,
}: {
  kind: "pickup" | "dropoff";
  initial: PlacePoint | null;
  /** Start by finding the device ("Use my current location"). */
  autoLocate?: boolean;
  /** Last known device position (blue dot), shared with the rest of the form. */
  me: DevicePosition | null;
  onDevicePosition: (position: DevicePosition) => void;
  onClose: () => void;
  onConfirm: (place: PlacePoint) => void;
}) {
  const [center, setCenter] = useState<LatLng | null>(initial ? { latitude: initial.lat, longitude: initial.lng } : null);
  const [placed, setPlaced] = useState(Boolean(initial));
  const [flyTo, setFlyTo] = useState<(LatLng & { key: number; zoom?: number }) | null>(null);
  const [moving, setMoving] = useState(false);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [addressTouched, setAddressTouched] = useState(Boolean(initial));
  const [looking, setLooking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRef(0);
  const title = kind === "pickup" ? "Where should the driver pick you up?" : "Where are you going?";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const settle = (point: LatLng) => {
    setCenter(point);
    setMoving(false);
    if (!placed) return;
    const ticket = ++lookup.current;
    setLooking(true);
    void reverseGeocode(point.latitude, point.longitude)
      .then((found) => {
        if (ticket !== lookup.current || !found) return;
        if (!addressTouched) setAddress(describe(found.address) || found.name);
      })
      .catch(() => {})
      .finally(() => ticket === lookup.current && setLooking(false));
  };

  const choose = (place: PlaceResult) => {
    setPlaced(true);
    setAddressTouched(false);
    setAddress([place.name, describe(place.address)].filter(Boolean).join(", "));
    setFlyTo({ latitude: place.latitude, longitude: place.longitude, zoom: 17, key: Date.now() });
  };

  // Device position: watched while the dialog is open so the blue dot sharpens as GPS
  // settles. The map (and pin) jump to it only once per "My location" press.
  const watch = useRef<number | null>(null);
  const flyOnFix = useRef(false);
  const [accuracyNote, setAccuracyNote] = useState("");

  const locate = useCallback(
    (moveMap: boolean) => {
      if (!window.isSecureContext) {
        return setError(
          "Your browser only shares location on a secure (https) or localhost address. Search for the place instead.",
        );
      }
      if (!navigator.geolocation) return setError("Your browser can’t share its location. Search instead.");
      setError("");
      flyOnFix.current = moveMap;
      if (moveMap) setLocating(true);
      if (watch.current !== null) return; // already watching; the next fix moves the map
      watch.current = navigator.geolocation.watchPosition(
        (pos) => {
          const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
          onDevicePosition(here);
          setAccuracyNote(
            here.accuracy > 150
              ? `Your location is approximate (about ${here.accuracy >= 1000 ? `${(here.accuracy / 1000).toFixed(1)} km` : `${Math.round(here.accuracy)} m`}). Drag the map so the pin sits on your door or gate.`
              : "",
          );
          if (flyOnFix.current) {
            flyOnFix.current = false;
            setLocating(false);
            setPlaced(true);
            setAddressTouched(false);
            setFlyTo({ latitude: here.latitude, longitude: here.longitude, zoom: here.accuracy > 500 ? 15 : 17, key: Date.now() });
          }
        },
        (reason) => {
          setLocating(false);
          if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
          watch.current = null;
          setError(
            reason.code === reason.PERMISSION_DENIED
              ? "Location access is blocked for this site. Allow it from the lock icon in the address bar, or search instead."
              : reason.code === reason.TIMEOUT
                ? "Finding your location is taking too long. Try again outdoors, or search instead."
                : "We couldn’t find your location. Search instead.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    },
    [onDevicePosition],
  );

  useEffect(
    () => () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    },
    [],
  );

  // Open on the rider: when asked to, or (for an empty pickup) when location is already
  // allowed, so nobody is surprised by a permission prompt.
  useEffect(() => {
    if (initial) return;
    if (autoLocate) {
      const timer = window.setTimeout(() => locate(true), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (!cancelled && status.state === "granted") locate(kind === "pickup");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Once, when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = () => {
    if (!placed || !center) return setError("Search for the place, or move the map so the pin sits on it.");
    if (address.trim().length < 3) return setError("Describe the place so the driver can find it.");
    onConfirm({ address: address.trim(), lat: Number(center.latitude.toFixed(6)), lng: Number(center.longitude.toFixed(6)) });
  };

  return (
    <div className={pick.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={pick.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <header className={pick.head}>
          <div>
            <h3>{title}</h3>
            <p>Search for the place, then drag the map so the pin sits exactly on the door or gate.</p>
          </div>
          <button type="button" className={pick.close} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className={pick.searchRow}>
          <PlaceSearch
            onPick={choose}
            label="Search a place"
            placeholder={kind === "pickup" ? "e.g. Karimabad bazaar, Hunza" : "e.g. Gilgit bus stand"}
          />
        </div>
        <div className={pick.mapBox}>
          <LocationMap
            center={center ?? { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1] }}
            zoom={center ? 16 : DEFAULT_ZOOM}
            flyTo={flyTo}
            onMoveStart={() => {
              setMoving(true);
              setPlaced(true);
            }}
            onCenterChange={settle}
            me={me}
          />
          <button type="button" className={pick.locate} onClick={() => locate(true)} disabled={locating}>
            {locating ? <LoaderCircle size={14} className="animate-spin" /> : <LocateFixed size={14} />}{" "}
            {locating ? "Finding you…" : "My location"}
          </button>
          {!placed ? <span className={pick.hint}>Search above or drag the map to place the pin</span> : null}
        </div>
        <div className={pick.details}>
          <label className={pick.nameField}>
            <span>Address the driver will see</span>
            <input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setAddressTouched(true);
              }}
              maxLength={300}
              placeholder="House, street, area and city"
            />
          </label>
          {looking ? (
            <p className={pick.address} role="status">
              <LoaderCircle size={13} className="animate-spin" /> Finding the address…
            </p>
          ) : null}
          {accuracyNote ? (
            <p className={x.locNote} role="status">
              <LocateFixed size={13} /> {accuracyNote}
            </p>
          ) : me ? (
            <p className={x.locNote}>
              <LocateFixed size={13} /> The blue dot is you. The pin is where the driver will come.
            </p>
          ) : null}
          {error ? <p className={pick.error}>{error}</p> : null}
          <div className={pick.actions}>
            <button type="button" className={pick.ghost} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={pick.primary} onClick={confirm} disabled={moving || looking}>
              <Check size={14} /> Use this {kind === "pickup" ? "pickup" : "drop-off"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
