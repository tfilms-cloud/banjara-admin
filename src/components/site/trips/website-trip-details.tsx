"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@/lib/live-query";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  BadgeCheck,
  Bookmark,
  Briefcase,
  BusFront,
  Check,
  ChevronRight,
  Clock3,
  Flag,
  ImageOff,
  Images,
  Map,
  MapPin,
  MessageSquare,
  Minus,
  Mountain,
  Phone,
  Plug,
  Plus,
  RefreshCw,
  Route,
  Share2,
  ShieldCheck,
  Snowflake,
  Star,
  Ticket,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import { useTripFavorites } from "@/hooks/use-trip-favorites";
import { transportAgencyHref } from "@/lib/agency-discovery";
import {
  tripBaseFare,
  tripBookingHref,
  tripBookingState,
  tripPhotos,
  tripPickup,
  tripPickupMap,
  tripQuantity,
  tripTimeline,
} from "@/lib/trip-details";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatDuration } from "@/lib/customer-destinations";
import { getTripById } from "@/services/customer/trip.service";
import { getAgencyReviews } from "@/services/customer/agency.service";
import type { PickupPoint, TripWithDetails } from "@/types/customer/trip";
import styles from "./trip-details.module.css";

function time(value?: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  if (!match) return "Time to be confirmed";
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
function TripPhoto({
  src,
  alt,
  eager = false,
}: {
  src?: string;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState("");
  return src && src !== failed ? (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(src)}
    />
  ) : (
    <div
      className={styles.noPhoto}
      role="img"
      aria-label={`${alt}: photo unavailable`}
    >
      <ImageOff size={30} />
      <span>Vehicle photo unavailable</span>
    </div>
  );
}
function Panel({
  title,
  eyebrow,
  action,
  children,
  id,
}: {
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className={styles.panel} id={id}>
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function featureIcon(label: string): LucideIcon {
  if (/wifi|wi-fi|internet/i.test(label)) return Wifi;
  if (/air|climate|heat|\bac\b/i.test(label)) return Snowflake;
  if (/usb|charg|power/i.test(label)) return Plug;
  if (/luggage|bag/i.test(label)) return Briefcase;
  return Check;
}
export function WebsiteTripDetails({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["customer", "trip-details", id],
    queryFn: () => getTripById(id),
    staleTime: 15000,
    refetchInterval: 30000,
  });
  if (query.isPending)
    return (
      <div className={styles.page}>
        <HomeState
          title="Loading your journey…"
          description="Fetching this trip’s latest details and availability."
          loading
        />
      </div>
    );
  if (!query.data)
    return (
      <div className={styles.page}>
        <HomeState
          title="Trip unavailable"
          description="This trip could not be loaded. Try again or explore another departure."
          retry={() => void query.refetch()}
        />
        <Link className={styles.backLink} href="/explore?service=transport">
          Back to trips <ArrowRight size={15} />
        </Link>
      </div>
    );
  return (
    <TripWorkspace
      key={query.data.id}
      trip={query.data}
      refreshing={query.isFetching}
      refresh={() => void query.refetch()}
    />
  );
}
function TripWorkspace({
  trip,
  refreshing,
  refresh,
}: {
  trip: TripWithDetails;
  refreshing: boolean;
  refresh: () => void;
}) {
  const [quantity, setQuantity] = useState(1),
    [pickupId, setPickupId] = useState(""),
    [photo, setPhoto] = useState<number | null>(null);
  const favorites = useTripFavorites();
  const availability = tripBookingState(trip),
    count = tripQuantity(trip, quantity),
    pickup = tripPickup(trip, pickupId),
    photos = tripPhotos(trip),
    fullVehicle = trip.bookingMode === "vehicle";
  const messageHref = trip.agency.userId
    ? `/account/messages?with=${encodeURIComponent(trip.agency.userId)}`
    : "";
  const phone = trip.agency.phone.replace(/[^+\d]/g, "");
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Trip link copied.");
    } catch {
      toast.error(
        "Copy this page’s address from your browser to share the trip.",
      );
    }
  };
  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <div>
          <ShieldCheck size={15} />
          {trip.agency.verified
            ? "Verified BANJARA provider"
            : "Published transport listing"}
          <span>·</span>
          <Route size={14} />
          {trip.from} → {trip.to}
        </div>
        <span>
          <span className={styles.dot} />
          {availability.canBook ? "Published departure" : availability.label}
        </span>
      </div>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={13} />
          <Link href="/explore">Explore</Link>
          <ChevronRight size={13} />
          <Link href="/explore?service=transport">Transportation & Charters</Link>
          <ChevronRight size={13} />
          <span>
            {trip.from} to {trip.to}
          </span>
        </nav>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.badges}>
              {trip.agency.verified && (
                <span>
                  <BadgeCheck size={13} />
                  Verified Provider
                </span>
              )}
              <span>
                <ArrowLeftRight size={13} />
                {trip.journeyType === "round_trip" ? "Round Trip" : "One Way"}
              </span>
              <span>
                <BusFront size={13} />
                {trip.vehicleName}
              </span>
              {fullVehicle && (
                <span className={styles.coral}>PRIVATE VEHICLE</span>
              )}
            </div>
            <h1>
              {trip.from} → {trip.to} <span>({trip.vehicleName})</span>
            </h1>
            <p className={styles.subheading}>
              <MapPin size={15} />
              {pickup?.name
                ? `Departs from ${pickup.name}`
                : `Departs from ${trip.from}`}{" "}
              to {trip.to}
            </p>
          </div>
          <div className={styles.quickFacts}>
            <div>
              <small>DEPARTURE</small>
              <strong>
                {formatDate(trip.date)}, {time(trip.departureTime)}
              </strong>
            </div>
            <div>
              <small>EST. DURATION</small>
              <strong className={styles.teal}>
                {trip.durationMinutes
                  ? formatDuration(trip.durationMinutes)
                  : "Confirm with provider"}
              </strong>
            </div>
            <div>
              <small>BASE FARE</small>
              <strong className={styles.coralText}>
                {formatCurrency(trip.price, trip.currency)}
              </strong>
              <p>/{fullVehicle ? "vehicle" : "seat"}</p>
            </div>
          </div>
        </div>
        <div className={styles.columns}>
          <div className={styles.main}>
            <Panel
              eyebrow="ASSIGNED FLEET"
              title={trip.vehicleName}
              action={
                <span className={styles.badge}>
                  <Users size={14} />
                  {fullVehicle
                    ? `${trip.vehicleCapacity || trip.totalSeats} passengers max`
                    : `${trip.availableSeats} / ${trip.totalSeats} seats left`}
                </span>
              }
            >
              <div className={styles.vehicleMeta}>
                {trip.vehiclePlate && <span>Reg: {trip.vehiclePlate}</span>}
                {trip.vehicleYear && <span>Model {trip.vehicleYear}</span>}
                <div className={styles.tools}>
                  <button
                    aria-label={
                      favorites.saved.has(trip.id) ? "Unsave trip" : "Save trip"
                    }
                    aria-pressed={favorites.saved.has(trip.id)}
                    disabled={favorites.pending}
                    onClick={() => favorites.toggle(trip.id)}
                  >
                    <Bookmark
                      size={16}
                      fill={
                        favorites.saved.has(trip.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                  <button aria-label="Share trip" onClick={() => void share()}>
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
              <button
                className={styles.heroPhoto}
                disabled={!photos.length}
                onClick={() => setPhoto(0)}
                aria-label="Open vehicle gallery"
              >
                <TripPhoto src={photos[0]} alt={trip.vehicleName} eager />
                <span className={styles.heroTag}>
                  <BusFront size={14} />
                  {trip.vehicleClass || trip.vehicleType}
                </span>
                <div className={styles.heroCaption}>
                  <div>
                    <h3>{trip.vehicleName}</h3>
                    <p>
                      {trip.from} → {trip.to}
                    </p>
                  </div>
                  {photos.length > 0 && (
                    <span>
                      <Images size={14} />
                      View {photos.length}{" "}
                      {photos.length === 1 ? "photo" : "photos"}
                    </span>
                  )}
                </div>
              </button>
              {photos.length > 1 && (
                <div className={styles.thumbnails}>
                  {photos.slice(1, 4).map((src, i) => (
                    <button
                      key={src}
                      onClick={() => setPhoto(i + 1)}
                      aria-label={`View vehicle photo ${i + 2}`}
                    >
                      <TripPhoto
                        src={src}
                        alt={`${trip.vehicleName} photo ${i + 2}`}
                      />
                      <span>Vehicle photo {i + 2}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className={styles.label}>TRANSIT AMENITIES INCLUDED</p>
              <div className={styles.amenities}>
                {trip.amenities.length ? (
                  trip.amenities.map((label) => {
                    const Icon = featureIcon(label);
                    return (
                      <div key={label}>
                        <span>
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3>{label}</h3>
                          <p>Published trip amenity</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.muted}>
                    Confirm luggage allowance and onboard facilities with your
                    provider.
                  </p>
                )}
              </div>
              {trip.description && (
                <p className={styles.description}>{trip.description}</p>
              )}
            </Panel>
            <Panel
              eyebrow="ITINERARY & MILESTONES"
              title="Transit Stops & Journey Details"
              action={
                <span className={styles.textNote}>
                  <Clock3 size={15} />
                  {trip.durationMinutes
                    ? `Travel time: ${formatDuration(trip.durationMinutes)}`
                    : "Confirm journey duration"}
                </span>
              }
            >
              <ol className={styles.timeline}>
                {tripTimeline(trip).map((stop, i) => (
                  <li key={`${stop.kind}-${stop.name}-${i}`}>
                    <span className={styles.timelineMarker}>
                      {i === 0 ? (
                        <BusFront size={14} />
                      ) : stop.kind === "Destination" ? (
                        <Flag size={14} />
                      ) : (
                        <span />
                      )}
                    </span>
                    <div>
                      <div className={styles.stopHeading}>
                        <h3>{stop.name}</h3>
                        <span className={styles.badge}>{stop.kind}</span>
                        {stop.time && <strong>{time(stop.time)}</strong>}
                      </div>
                      {stop.description && <p>{stop.description}</p>}
                      {stop.kind === "Destination" && trip.arrivalDate && (
                        <small>
                          Arrival date: {formatDate(trip.arrivalDate)}
                        </small>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel
              eyebrow="BOARDING SELECTION"
              title="Select Departure Pickup Point"
              id="trip-pickup"
              action={
                <span className={styles.textNote}>
                  <MapPin size={14} />
                  {trip.pickupLocations.length}{" "}
                  {trip.pickupLocations.length === 1 ? "location" : "locations"}
                </span>
              }
            >
              {pickup ? (
                <>
                  <PickupMap point={pickup} />
                  <div
                    className={styles.pickups}
                    role="radiogroup"
                    aria-label="Departure pickup point"
                  >
                    {trip.pickupLocations.map((point) => (
                      <article
                        className={styles.pickup}
                        key={point.id}
                        data-selected={point.id === pickup.id}
                      >
                        <label>
                          <input
                            type="radio"
                            name="trip-pickup"
                            checked={point.id === pickup.id}
                            onChange={() => setPickupId(point.id)}
                          />
                          <div>
                            <h3>{point.name}</h3>
                            {point.address && <p>{point.address}</p>}
                            {point.landmark && (
                              <small>Landmark: {point.landmark}</small>
                            )}
                            {point.description && (
                              <small>{point.description}</small>
                            )}
                          </div>
                        </label>
                        <a
                          href={tripPickupMap(point).external}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open map <ArrowUpRight size={13} />
                        </a>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <HomeState
                  title="Confirm pickup with your provider"
                  description="This trip does not have a published pickup point yet."
                />
              )}
            </Panel>
            <section
              className={`${styles.panel} ${styles.agencyCard}`}
              aria-label="Trip provider"
            >
              <div className={styles.agencyIdentity}>
                {trip.agency.logo ? (
                  <div className={styles.agencyLogo}>
                    <TripPhoto
                      src={trip.agency.logo}
                      alt={`${trip.agency.name} logo`}
                    />
                  </div>
                ) : (
                  <span className={styles.agencyLogo}>
                    <BusFront size={25} />
                  </span>
                )}
                <div>
                  <h2>
                    {trip.agency.name}
                    {trip.agency.verified && <BadgeCheck size={16} />}
                  </h2>
                  <p>{trip.agency.city ? `Local driver · ${trip.agency.city}` : "Your local driver"}</p>
                  <p className={styles.rating}>
                    <Star size={13} fill="currentColor" />
                    {trip.rating > 0
                      ? `${trip.rating.toFixed(1)} (${trip.agency.reviewCount} reviews)`
                      : "New provider · No reviews yet"}
                  </p>
                </div>
              </div>
              <div className={styles.agencyActions}>
                {messageHref && (
                  <Link href={messageHref} className={styles.softButton}>
                    <MessageSquare size={15} />
                    Direct Message
                  </Link>
                )}
                <Link
                  href={transportAgencyHref(trip)}
                  className={styles.outline}
                >
                  <BusFront size={15} />
                  Driver profile
                </Link>
              </div>
            </section>
            <TripReviews providerId={trip.agencyId} />
            <section className={styles.preparation}>
              <div>
                <span>
                  <Mountain size={23} />
                </span>
                <div>
                  <h2>Before Your Mountain Journey</h2>
                  <p>Keep your booking details and provider contacts ready.</p>
                </div>
              </div>
              <div className={styles.preparationGrid}>
                <article>
                  <Ticket size={15} />
                  <h3>Your booking details</h3>
                  <p>
                    Review your travel date, pickup point and passenger details
                    before confirming.
                  </p>
                </article>
                <article>
                  <Route size={15} />
                  <h3>Road & weather updates</h3>
                  <p>
                    Ask your provider to confirm the planned route and
                    conditions before departure.
                  </p>
                </article>
                <article>
                  <Briefcase size={15} />
                  <h3>Luggage & boarding</h3>
                  <p>
                    Confirm baggage allowance, arrival time and any group
                    requirements with your driver.
                  </p>
                </article>
              </div>
            </section>
          </div>
          <aside className={styles.sidebar} aria-label="Trip reservation">
            <section className={styles.reservation} id="trip-reservation">
              <div className={styles.fareHeading}>
                <div>
                  <p className={styles.label}>
                    {fullVehicle
                      ? "PRIVATE VEHICLE FARE"
                      : "STANDARD SEAT FARE"}
                  </p>
                  <h2>
                    {formatCurrency(trip.price, trip.currency)}
                    <small>
                      {trip.currency} / {fullVehicle ? "vehicle" : "seat"}
                    </small>
                  </h2>
                </div>
                <span className={styles.badge}>
                  <Users size={13} />
                  {fullVehicle ? "1 vehicle" : `${trip.availableSeats} left`}
                </span>
              </div>
              <dl className={styles.reservationFacts}>
                <div>
                  <dt>Route:</dt>
                  <dd>
                    {trip.from} → {trip.to}
                  </dd>
                </div>
                <div>
                  <dt>Date & Time:</dt>
                  <dd>
                    {formatDate(trip.date)}, {time(trip.departureTime)}
                  </dd>
                </div>
                <div>
                  <dt>Booking:</dt>
                  <dd className={styles.teal}>
                    {fullVehicle ? "Vehicle booking" : "Passenger seats"}
                  </dd>
                </div>
                {trip.journeyType === "round_trip" && trip.returnDate && (
                  <div>
                    <dt>Return:</dt>
                    <dd>
                      {formatDate(trip.returnDate)}{" "}
                      {trip.returnTime ? time(trip.returnTime) : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <div className={styles.quantityHeading}>
                <label htmlFor="trip-quantity">
                  {fullVehicle ? "Vehicle quantity" : "Number of passengers"}
                </label>
                <small>
                  {fullVehicle
                    ? `Up to ${trip.vehicleCapacity || trip.totalSeats} passengers`
                    : `Max ${availability.maxPassengers} per booking`}
                </small>
              </div>
              <div className={styles.quantity}>
                <span>
                  <Users size={19} />
                  {count}{" "}
                  {fullVehicle
                    ? "vehicle selected"
                    : count === 1
                      ? "seat selected"
                      : "seats selected"}
                </span>
                <button
                  aria-label="Decrease passengers"
                  disabled={!availability.canBook || count <= 1 || fullVehicle}
                  onClick={() => setQuantity(count - 1)}
                >
                  <Minus size={14} />
                </button>
                <input
                  id="trip-quantity"
                  aria-label="Passenger quantity"
                  type="number"
                  min={1}
                  max={Math.max(1, availability.maxPassengers)}
                  value={count}
                  readOnly
                />
                <button
                  aria-label="Increase passengers"
                  disabled={
                    !availability.canBook ||
                    count >= availability.maxPassengers ||
                    fullVehicle
                  }
                  onClick={() => setQuantity(count + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className={styles.label}>SELECTED PICKUP STATION</p>
              <a className={styles.pickupSummary} href="#trip-pickup">
                <MapPin size={14} />
                {pickup?.name || "Confirm with your provider"}
              </a>
              <div className={styles.priceLines}>
                <div>
                  <span>
                    Base {fullVehicle ? "vehicle" : "seat"} fare{" "}
                    {fullVehicle
                      ? ""
                      : `(${count} × ${formatCurrency(trip.price, trip.currency)})`}
                  </span>
                  <span>
                    {formatCurrency(tripBaseFare(trip, count), trip.currency)}
                  </span>
                </div>
                <p>
                  Taxes and service fees are calculated by the booking service
                  on confirmation.
                </p>
              </div>
              <div className={styles.total}>
                <h3>Base fare subtotal</h3>
                <strong>
                  {formatCurrency(tripBaseFare(trip, count), trip.currency)}
                </strong>
              </div>
              <p className={styles.totalNote}>
                Tax and service fee are added when you book. Nothing is paid until your driver approves.
              </p>
              {availability.canBook ? (
                <>
                  <Link href={tripBookingHref(trip, count, pickup?.id)} className={styles.continue}>
                    Continue to booking <ArrowRight size={16} />
                  </Link>
                  <Link
                    href={messageHref || (phone ? `tel:${phone}` : transportAgencyHref(trip))}
                    className={styles.askDriver}
                  >
                    <MessageSquare size={14} /> Ask the driver a question first
                  </Link>
                </>
              ) : (
                <div className={styles.unavailable} role="status">
                  <h3>{availability.label}</h3>
                  <p>Explore another published departure with this driver.</p>
                  <Link href={transportAgencyHref(trip)}>
                    View driver’s departures <ArrowRight size={14} />
                  </Link>
                </div>
              )}
              <ul className={styles.bookingNotes}>
                <li>
                  <ShieldCheck size={15} />
                  <span>
                    Check the selected trip, fare and pickup point before
                    booking.
                  </span>
                </li>
                <li>
                  <Ticket size={15} />
                  <span>
                    Your booking status and issued passes appear in My Bookings.
                  </span>
                </li>
                <li>
                  <Mountain size={15} />
                  <span>
                    Confirm road conditions and the cancellation policy with
                    your provider.
                  </span>
                </li>
              </ul>
              <button
                className={styles.refresh}
                disabled={refreshing}
                onClick={refresh}
              >
                <RefreshCw size={13} />
                {refreshing
                  ? "Refreshing availability…"
                  : "Refresh availability"}
              </button>
            </section>
            {(phone || messageHref) && (
              <section className={styles.support}>
                <span>
                  <MessageSquare size={22} />
                </span>
                <div>
                  <h3>Contact your transport provider</h3>
                  <p>{trip.agency.name}</p>
                </div>
                {phone ? (
                  <a href={`tel:${phone}`}>
                    Call <Phone size={12} />
                  </a>
                ) : (
                  <Link href={messageHref}>Message</Link>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
      {availability.canBook && (
        <div className={styles.mobileBooking}>
          <div>
            <small>Base fare subtotal</small>
            <strong>
              {formatCurrency(tripBaseFare(trip, count), trip.currency)}
            </strong>
          </div>
          <Link href={tripBookingHref(trip, count, pickup?.id)}>
            Book now <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {photo !== null && (
        <HomeDialog
          title={`${trip.vehicleName} gallery`}
          onClose={() => setPhoto(null)}
        >
          <div className={styles.galleryDialog}>
            <TripPhoto
              src={photos[photo]}
              alt={`${trip.vehicleName} photo ${photo + 1}`}
            />
            <p>
              {photo + 1} / {photos.length}
            </p>
            <div>
              {photos.map((src, i) => (
                <button
                  key={src}
                  aria-label={`Select vehicle photo ${i + 1}`}
                  aria-pressed={photo === i}
                  onClick={() => setPhoto(i)}
                >
                  <TripPhoto src={src} alt={`Vehicle photo ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </HomeDialog>
      )}
    </div>
  );
}
function PickupMap({ point }: { point: PickupPoint }) {
  const map = tripPickupMap(point);
  return (
    <div className={styles.pickupMap}>
      <iframe
        src={map.embed}
        title={`${point.name} pickup map`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <a href={map.external} target="_blank" rel="noreferrer">
        <Map size={14} />
        {point.name}
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
function TripReviews({ providerId }: { providerId: string }) {
  const query = useQuery({
    queryKey: ["customer", "agency-reviews", providerId],
    queryFn: () => getAgencyReviews(providerId),
    enabled: !!providerId,
    retry: 1,
  });
  const [limit, setLimit] = useState(2);
  const rows = query.data || [];
  return (
    <Panel
      title="Traveler Experiences"
      eyebrow="AGENCY TRAVELER FEEDBACK"
      action={
        <span className={styles.textNote}>
          <Star size={14} />
          {rows.length} {rows.length === 1 ? "review" : "reviews"}
        </span>
      }
    >
      {query.isPending ? (
        <HomeState
          title="Loading feedback…"
          description="Reading this driver’s traveler reviews."
          loading
        />
      ) : query.isError ? (
        <HomeState
          title="Reviews unavailable"
          description="Traveler feedback could not be loaded."
          retry={() => void query.refetch()}
        />
      ) : rows.length ? (
        <>
          <div className={styles.reviewGrid}>
            {rows.slice(0, limit).map((r) => (
              <article key={r.id}>
                <div>
                  <span>
                    <Users size={19} />
                  </span>
                  <div>
                    <h3>BANJARA traveler</h3>
                    <p>{formatDate(r.createdAt)}</p>
                  </div>
                  <strong>
                    <Star size={13} fill="currentColor" />
                    {r.rating.toFixed(1)}
                  </strong>
                </div>
                <p>
                  {r.comment ||
                    "This traveler left a rating without a written review."}
                </p>
                {r.reply && (
                  <aside>
                    <strong>Driver’s response</strong>
                    <p>{r.reply}</p>
                  </aside>
                )}
              </article>
            ))}
          </div>
          {rows.length > limit && (
            <button
              className={styles.outline}
              onClick={() => setLimit(limit + 2)}
            >
              Show more reviews
            </button>
          )}
        </>
      ) : (
        <HomeState
          title="No traveler reviews yet"
          description="Feedback for this driver will appear here once published."
        />
      )}
    </Panel>
  );
}
