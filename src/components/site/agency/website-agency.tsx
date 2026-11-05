"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BusFront,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Home,
  ImageOff,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Route,
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import {
  agencyDepartures,
  agencyRouteKey,
  filterAgencyDepartures,
} from "@/lib/agency-profile";
import { customerDel, customerPost } from "@/lib/customer-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getTransportAgency,
  getAgencyTrips,
  getAgencyReviews,
  mapTransportAgency,
} from "@/services/customer/agency.service";
import { getCustomerSavedItems } from "@/services/customer/profile.service";
import type {
  AgencyTrip,
  AgencyVehicle,
  TransportAgency,
} from "@/types/customer/agency";
import styles from "./agency.module.css";

function time(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value || "Time not published";
  const hours = Number(match[1]);
  return `${String(hours % 12 || 12).padStart(2, "0")}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}
function Photo({
  src,
  alt,
  className,
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(src)}
    />
  ) : (
    <div
      className={`${styles.photoFallback} ${className || ""}`}
      role="img"
      aria-label={`${alt} — photo unavailable`}
    >
      <ImageOff size={30} />
      <span>Photo unavailable</span>
    </div>
  );
}
function Panel({
  eyebrow,
  title,
  action,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
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
export function WebsiteAgency({ id }: { id: string }) {
  const provider = useQuery({
    queryKey: ["customer", "agency", id],
    queryFn: () => getTransportAgency(id),
    retry: 1,
  });
  const trips = useQuery({
    queryKey: ["customer", "agency-trips", id],
    queryFn: () => getAgencyTrips(id),
    retry: 1,
  });
  if (provider.isPending)
    return (
      <div className={styles.page}>
        <HomeState
          title="Loading driver profile…"
          description="Fetching this provider's public profile."
          loading
        />
      </div>
    );
  if (provider.isError)
    return (
      <div className={styles.page}>
        <HomeState
          title="Profile unavailable"
          description="We couldn’t load this transport profile. Please try again or return to Explore."
          retry={() => void provider.refetch()}
        />
        <Link className={styles.back} href="/explore">
          Back to Explore <ArrowRight size={16} />
        </Link>
      </div>
    );
  const agency = mapTransportAgency(provider.data, trips.data || []);
  return (
    <AgencyWorkspace
      key={id}
      agency={agency}
      trips={trips.data || []}
      tripsLoading={trips.isPending}
      tripsError={trips.isError}
      refresh={() => void trips.refetch()}
    />
  );
}
function AgencyWorkspace({
  agency,
  trips,
  tripsLoading,
  tripsError,
  refresh,
}: {
  agency: TransportAgency;
  trips: AgencyTrip[];
  tripsLoading: boolean;
  tripsError: boolean;
  refresh: () => void;
}) {
  const auth = useCustomerAuth(),
    client = useQueryClient();
  const [lightbox, setLightbox] = useState<AgencyVehicle | null>(null),
    [photoIndex, setPhotoIndex] = useState(0);
  const saved = useQuery({
    queryKey: ["customer", "profile-favorites", auth.user?.id],
    queryFn: getCustomerSavedItems,
    enabled: auth.user?.role === "customer" && !auth.loading,
  });
  const favorite = saved.data?.find(
    (s) => s.kind === "provider" && s.targetId === agency.id,
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!saved.isSuccess)
        throw new Error("Saved providers could not be loaded. Try again.");
      if (favorite) await customerDel(`/favorites/${favorite.id}`);
      else
        await customerPost("/favorites", {
          targetType: "provider",
          targetId: agency.id,
        });
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["customer", "profile-favorites"],
      });
    },
    onError: (e) => toast.error(e.message),
  });
  const departures = agencyDepartures(trips);
  const routes = [
    ...new Map(departures.map((t) => [agencyRouteKey(t), t])).values(),
  ];
  const messageHref = agency.userId
    ? `/account/messages?with=${encodeURIComponent(agency.userId)}`
    : "";
  const phone = agency.phone.replace(/[^\d+]/g, "");
  const callHref = phone ? `tel:${phone}` : "";
  const openGallery = (vehicle: AgencyVehicle, index = 0) => {
    setPhotoIndex(index);
    setLightbox(vehicle);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied.");
    } catch {
      toast.error(
        "Couldn’t copy the link. You can copy this page’s address from your browser.",
      );
    }
  };
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbRow}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">
            <Home size={13} />
            Home
          </Link>
          <ChevronRight size={13} />
          <Link href="/explore">Explore</Link>
          <ChevronRight size={13} />
          <Link href="/explore?service=transport">Rides</Link>
          <ChevronRight size={13} />
          <span>{agency.name}</span>
        </nav>
        <span className={styles.badge}>
          <span className={styles.dot} />
          Local driver
        </span>
      </div>
      <section className={styles.overview}>
        <div className={styles.container}>
          <div className={styles.identityRow}>
            <div className={styles.identity}>
              <div className={styles.logo}>
                {agency.driver?.photo || agency.logo ? (
                  <Photo src={agency.driver?.photo || agency.logo} alt={agency.name} />
                ) : (
                  <BusFront size={42} />
                )}{" "}
                {agency.verified && (
                  <span className={styles.verifiedIcon}>
                    <ShieldCheck size={15} />
                  </span>
                )}
              </div>
              <div>
                <div className={styles.titleRow}>
                  <h1>{agency.name}</h1>
                  {agency.verified && (
                    <span className={styles.badge}>
                      <span className={styles.dot} />
                      Verified driver
                    </span>
                  )}
                </div>
                <p className={styles.subtitle}>
                  Local driver · drives their own vehicle
                </p>
                <div className={styles.meta}>
                  {(agency.driver?.experience || agency.yearsExperience) && (
                    <span>
                      <Clock3 size={13} />
                      {agency.driver?.experience || agency.yearsExperience} years of driving
                    </span>
                  )}
                  {agency.city && (
                    <span>
                      <MapPin size={13} />
                      {agency.city}
                    </span>
                  )}
                  <span>
                    <ShieldCheck size={13} />
                    {agency.verified
                      ? "Approved BANJARA driver"
                      : "Driver profile"}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.identityActions}>
              {auth.isAuthenticated ? (
                <button
                  className={styles.iconButton}
                  aria-label={favorite ? "Unsave driver" : "Save driver"}
                  aria-pressed={!!favorite}
                  disabled={saved.isPending || save.isPending}
                  onClick={() => save.mutate()}
                >
                  <Bookmark
                    size={18}
                    fill={favorite ? "currentColor" : "none"}
                  />
                </button>
              ) : (
                <Link
                  className={styles.iconButton}
                  href={`/account?auth=signin&next=${encodeURIComponent(`/agencies/${agency.id}`)}`}
                  aria-label="Sign in to save driver"
                >
                  <Bookmark size={18} />
                </Link>
              )}
              <button
                className={styles.iconButton}
                onClick={() => void share()}
                aria-label="Share driver"
              >
                <Share2 size={17} />
              </button>
              {callHref && (
                <a className={styles.outline} href={callHref}>
                  <Phone size={16} />
                  {agency.phone}
                </a>
              )}
              {messageHref && (
                <Link className={styles.primary} href={messageHref}>
                  <MessageSquare size={17} />
                  Direct Message
                </Link>
              )}
            </div>
          </div>
          <div className={styles.stats}>
            <Metric label="TRAVELER RATING" icon={<Star size={21} />}>
              <strong>
                {agency.rating > 0 ? agency.rating.toFixed(1) : "New"}
              </strong>
              <span>
                {agency.reviewCount
                  ? `(${agency.reviewCount} reviews)`
                  : "No reviews yet"}
              </span>
            </Metric>
            <Metric label="UPCOMING DEPARTURES" icon={<Users size={22} />}>
              <strong>
                {tripsLoading || tripsError ? "—" : departures.length}
              </strong>
              <span>Published journeys</span>
            </Metric>
            <Metric label="SERVICE NETWORK" icon={<Route size={22} />}>
              <strong>
                {tripsLoading || tripsError ? "—" : routes.length}
              </strong>
              <span>Upcoming routes</span>
            </Metric>
            <Metric label="DRIVING EXPERIENCE" icon={<ShieldCheck size={21} />}>
              <strong>{agency.driver?.experience || agency.yearsExperience || "—"}</strong>
              <span>Years on the road</span>
            </Metric>
          </div>
        </div>
      </section>
      <div className={`${styles.container} ${styles.columns}`}>
        <div className={styles.mainColumn}>
          <Fleet fleet={agency.fleet} openGallery={openGallery} />
          <Panel
            eyebrow="TRANSIT TIMETABLE"
            title="Regular Service Lines & Schedules"
            id="agency-departures"
            action={
              <button
                className={styles.textAction}
                onClick={refresh}
                aria-label="Refresh departures"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            }
          >
            {tripsLoading ? (
              <HomeState
                title="Loading departures…"
                description="Checking published service lines."
                loading
              />
            ) : tripsError ? (
              <HomeState
                title="Departures unavailable"
                description="The schedule could not be loaded."
                retry={refresh}
              />
            ) : departures.length ? (
              <div className={styles.scheduleList}>
                {departures.map((t) => (
                  <Schedule key={t.id} trip={t} />
                ))}
              </div>
            ) : (
              <HomeState
                title="No upcoming departures"
                description="Contact this provider for their next service or private charter availability."
              />
            )}
          </Panel>
          <Hubs agency={agency} trips={trips} />
          <Panel
            eyebrow="YOUR DRIVER"
            title="Meet your local driver"
            action={<span className={styles.badge}>Drives every ride</span>}
          >
            <div className={styles.crewGrid}>
              {agency.driver ? (
                <article className={styles.inset}>
                  <div className={styles.crewIdentity}>
                    {agency.driver.photo ? (
                      <Photo
                        src={agency.driver.photo}
                        alt={agency.driver.name}
                      />
                    ) : (
                      <span className={styles.avatar}>
                        <Users size={23} />
                      </span>
                    )}
                    <div>
                      <h3>{agency.driver.name}</h3>
                      <p className={styles.teal}>Local driver · drives their own vehicle</p>
                      {agency.driver.experience && (
                        <p>
                          {agency.driver.experience} years of driving experience
                        </p>
                      )}
                    </div>
                  </div>
                  <p className={styles.body}>
                    You ride with {agency.driver.name} on every booking. Message
                    them to agree pickup details.
                  </p>
                </article>
              ) : (
                <article className={styles.inset}>
                  <Users className={styles.teal} size={25} />
                  <h3>Your local driver</h3>
                  <p className={styles.body}>
                    {agency.name} drives every ride on this profile in their own
                    vehicle.
                  </p>
                </article>
              )}
              <article className={styles.inset}>
                <ShieldCheck size={25} className={styles.teal} />
                <h3>Plan directly with {agency.name}</h3>
                <p className={styles.body}>
                  Confirm pickup arrangements, luggage requirements and road
                  conditions before you travel.
                </p>
                {messageHref && (
                  <Link className={styles.textAction} href={messageHref}>
                    Ask the provider <ArrowRight size={14} />
                  </Link>
                )}
              </article>
            </div>
          </Panel>
          <Panel
            eyebrow="ABOUT THE DRIVER"
            title={`About ${agency.name} & Travel Information`}
          >
            <p className={styles.about}>
              {agency.description ||
                "This driver has not written an introduction yet. Message them to learn more about their routes."}
            </p>
            {(agency.operatingCities.length > 0 ||
              agency.operatingRoutes.length > 0) && (
              <div className={styles.network}>
                <p className={styles.label}>REGISTERED SERVICE AREA</p>
                <div className={styles.chips}>
                  {[
                    ...new Set([
                      ...agency.operatingCities,
                      ...agency.operatingRoutes,
                    ]),
                  ].map((v) => (
                    <span key={v}>
                      <MapPin size={12} />
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.infoGrid}>
              <article className={styles.inset}>
                <Compass size={23} />
                <h3>Prepare for the mountains</h3>
                <p>
                  Check weather and route conditions with your provider before
                  leaving.
                </p>
              </article>
              <article className={styles.inset}>
                <Ticket size={23} />
                <h3>Check your booking</h3>
                <p>
                  Review the fare, booking mode and pickup point before
                  confirming.
                </p>
              </article>
              <article className={styles.inset}>
                <MessageSquare size={23} />
                <h3>Stay connected</h3>
                <p>
                  Keep your provider’s published contact details close at hand.
                </p>
              </article>
            </div>
          </Panel>
          <Reviews providerId={agency.id} />
        </div>
        <aside
          className={styles.sidebar}
          aria-label="Reservations and provider contact"
        >
          <Reservations
            trips={departures}
            agencyName={agency.name}
            messageHref={messageHref}
            loading={tripsLoading}
            error={tripsError}
            refresh={refresh}
          />
          <section className={styles.contactCard}>
            <p className={styles.label}>CONTACT THE DRIVER</p>
            <h3>{agency.name}</h3>
            <p>{agency.city || "Local driver"}</p>
            <div>
              {callHref && (
                <a href={callHref}>
                  <Phone size={13} />
                  Call Base
                </a>
              )}
              {messageHref && (
                <Link href={messageHref}>
                  <MessageSquare size={14} />
                  Send Query
                </Link>
              )}
              {!callHref && !messageHref && (
                <p>Contact details have not been published.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
      {lightbox && (
        <HomeDialog title={lightbox.name} onClose={() => setLightbox(null)}>
          <div className={styles.galleryDialog}>
            <Photo
              src={lightbox.photos[photoIndex]}
              alt={`${lightbox.name} photo ${photoIndex + 1}`}
            />
            <p>
              {photoIndex + 1} / {lightbox.photos.length}
            </p>
            <div className={styles.chips}>
              {lightbox.photos.map((src, i) => (
                <button
                  key={src}
                  aria-label={`View photo ${i + 1}`}
                  aria-pressed={photoIndex === i}
                  onClick={() => setPhotoIndex(i)}
                >
                  <Photo src={src} alt={`Photo ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </HomeDialog>
      )}
    </div>
  );
}
function Metric({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.metric}>
      <div>
        <p>{label}</p>
        <div>{children}</div>
      </div>
      <span className={styles.teal}>{icon}</span>
    </div>
  );
}
function Fleet({
  fleet,
  openGallery,
}: {
  fleet: AgencyVehicle[];
  openGallery: (v: AgencyVehicle, i?: number) => void;
}) {
  const [selected, setSelected] = useState("");
  const vehicle = fleet.find((v) => v.id === selected) || fleet[0];
  return (
    <Panel
      eyebrow="THE DRIVER’S VEHICLE"
      title={vehicle?.name || "Vehicle"}
      action={
        fleet.length > 1 && (
          <div
            className={styles.fleetTabs}
            role="group"
            aria-label="Vehicles"
          >
            {fleet.map((v) => (
              <button
                key={v.id}
                aria-pressed={vehicle?.id === v.id}
                onClick={() => setSelected(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
        )
      }
    >
      {!vehicle ? (
        <HomeState
          title="Vehicle details coming soon"
          description="This driver has not published their vehicle information yet."
        />
      ) : (
        <>
          <button
            className={styles.heroPhoto}
            disabled={!vehicle.photos.length}
            onClick={() => openGallery(vehicle)}
            aria-label={`Open ${vehicle.name} gallery`}
          >
            <Photo src={vehicle.photos[0]} alt={vehicle.name} eager />
            {vehicle.plate && (
              <span className={styles.plate}>Reg: {vehicle.plate}</span>
            )}
            <div className={styles.photoCaption}>
              <div>
                <h3>{vehicle.name}</h3>
                <p>{vehicle.kind || "Provider vehicle"}</p>
              </div>
              {vehicle.capacity && (
                <span>
                  <Users size={15} />
                  {vehicle.capacity} seats
                </span>
              )}
            </div>
          </button>
          {vehicle.photos.length > 1 && (
            <div className={styles.thumbnails}>
              {vehicle.photos.slice(0, 4).map((src, i) => (
                <button
                  key={src}
                  onClick={() => openGallery(vehicle, i)}
                  aria-label={`Open ${vehicle.name} photo ${i + 1}`}
                >
                  <Photo src={src} alt={`${vehicle.name} photo ${i + 1}`} />
                  <span>Vehicle photo {i + 1}</span>
                </button>
              ))}
            </div>
          )}
          <p className={styles.label}>VEHICLE EQUIPMENT & FEATURES</p>
          <div className={styles.chips}>
            {vehicle.amenities.length ? (
              vehicle.amenities.map((a) => (
                <span key={a}>
                  <Check size={13} />
                  {a}
                </span>
              ))
            ) : (
              <p className={styles.muted}>
                Ask your provider about luggage allowance and onboard amenities.
              </p>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
function Schedule({ trip }: { trip: AgencyTrip }) {
  return (
    <article className={styles.schedule}>
      <div>
        <div className={styles.scheduleTop}>
          <span className={styles.darkBadge}>
            {trip.bookingMode === "vehicle"
              ? "PRIVATE VEHICLE"
              : "SCHEDULED SERVICE"}
          </span>
          <span>
            {formatDate(trip.date)} · {time(trip.departureTime)}
          </span>
        </div>
        <div className={styles.route}>
          <div>
            <h3>{trip.from}</h3>
            <p>Dept: {time(trip.departureTime)}</p>
          </div>
          <span>
            ╌╌╌
            <ArrowRight size={17} />
          </span>
          <div>
            <h3>{trip.to}</h3>
            <p>Arrival: {time(trip.arrivalTime)}</p>
          </div>
        </div>
        <p className={styles.scheduleDetails}>
          <BusFront size={13} />
          {trip.vehicleName} ·{" "}
          {trip.bookingMode === "vehicle"
            ? `${trip.vehicleCapacity || trip.availableSeats} passengers max`
            : `${trip.availableSeats} seats available`}
        </p>
      </div>
      <div className={styles.fare}>
        <p>
          {trip.bookingMode === "vehicle"
            ? "Per vehicle"
            : "Per passenger seat"}
        </p>
        <strong>{formatCurrency(trip.price, trip.currency)}</strong>
        <Link className={styles.primary} href={`/trips/${trip.id}`}>
          View trip details
        </Link>
      </div>
    </article>
  );
}
function Reservations({
  trips,
  agencyName,
  messageHref,
  loading,
  error,
  refresh,
}: {
  trips: AgencyTrip[];
  agencyName: string;
  messageHref: string;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}) {
  const [route, setRoute] = useState(""),
    [date, setDate] = useState("");
  const routes = [
    ...new Map(trips.map((t) => [agencyRouteKey(t), t])).entries(),
  ];
  const selectedRoute = route || routes[0]?.[0] || "";
  const earliest =
    trips.find((t) => agencyRouteKey(t) === selectedRoute)?.date.slice(0, 10) ||
    "";
  const selectedDate = date || earliest;
  const matches = filterAgencyDepartures(trips, selectedRoute, selectedDate);
  return (
    <section className={styles.reservation}>
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>FAST RESERVATION</p>
          <h2>Book with {agencyName}</h2>
        </div>
        <span className={styles.reservationIcon}>
          <Ticket size={18} />
        </span>
      </div>
      {loading ? (
        <HomeState
          title="Loading departures…"
          description="Checking this driver’s schedule."
          loading
        />
      ) : error ? (
        <HomeState
          title="Schedule unavailable"
          description="Try loading departures again."
          retry={refresh}
        />
      ) : (
        <>
          <label className={styles.field}>
            Select highway route
            <select
              value={selectedRoute}
              disabled={!routes.length}
              onChange={(e) => {
                setRoute(e.target.value);
                setDate("");
              }}
            >
              {routes.length ? (
                routes.map(([key, t]) => (
                  <option value={key} key={key}>
                    {t.from} → {t.to}
                  </option>
                ))
              ) : (
                <option>No routes published</option>
              )}
            </select>
          </label>
          <label className={styles.field}>
            Departure date
            <div className={styles.dateField}>
              <CalendarDays size={17} />
              <input
                type="date"
                aria-label="Departure date"
                value={selectedDate}
                onChange={(e) => setDate(e.target.value)}
                disabled={!routes.length}
              />
              {date && (
                <button
                  onClick={() => setDate("")}
                  aria-label="Reset departure date"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </label>
          <p className={styles.label}>UPCOMING SCHEDULED DEPARTURES</p>
          <div className={styles.departureList}>
            {matches.length ? (
              matches.map((t, i) => (
                <article
                  className={styles.departure}
                  data-first={i === 0}
                  key={t.id}
                >
                  <div className={styles.departureTop}>
                    <strong>{time(t.departureTime)}</strong>
                    <span>{t.vehicleName}</span>
                    <span className={styles.seats}>
                      {t.bookingMode === "vehicle"
                        ? `${t.vehicleCapacity || t.availableSeats} passengers max`
                        : `${t.availableSeats} seats left`}
                    </span>
                  </div>
                  <div className={styles.departureBottom}>
                    <div>
                      <p>
                        {t.bookingMode === "vehicle"
                          ? "Per vehicle"
                          : "Per passenger seat"}
                      </p>
                      <strong>{formatCurrency(t.price, t.currency)}</strong>
                    </div>
                    <Link
                      href={`/trips/${t.id}`}
                      className={i === 0 ? styles.primary : styles.outline}
                    >
                      View trip details
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.noDepartures}>
                <CalendarDays size={24} />
                <h3>No departures for this date</h3>
                <p>Choose another date or contact the provider.</p>
              </div>
            )}
          </div>
        </>
      )}
      <div className={styles.charter}>
        <Users size={24} />
        <div>
          <h3>Need a Private Expedition Charter?</h3>
          <p>Ask about a full vehicle and driver for your group’s journey.</p>
          {messageHref ? (
            <Link href={messageHref}>
              Request charter quote <ArrowRight size={14} />
            </Link>
          ) : (
            <Link href="/explore">
              Explore transport <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
      <ul className={styles.bookingNotes}>
        <li>
          <ShieldCheck size={15} />
          Review the provider and fare before booking.
        </li>
        <li>
          <Ticket size={15} />
          Find confirmed booking details in My Bookings.
        </li>
        <li>
          <MessageSquare size={15} />
          Confirm road conditions and pickup arrangements.
        </li>
      </ul>
    </section>
  );
}
function Hubs({
  agency,
  trips,
}: {
  agency: TransportAgency;
  trips: AgencyTrip[];
}) {
  const points = [
    ...new Map(
      trips
        .flatMap((t) => [
          ...t.pickupLocations.map((p) => ({
            ...p,
            kind: "Departure pickup",
            route: `${t.from} → ${t.to}`,
          })),
          ...t.dropoffLocations.map((p) => ({
            ...p,
            kind: "Arrival drop-off",
            route: `${t.from} → ${t.to}`,
          })),
        ])
        .map((p) => [`${p.kind}:${p.name}:${p.address}`, p]),
    ).values(),
  ];
  const registered = [
    ...agency.pickups.map((name) => ({
      id: `p-${name}`,
      name,
      address: "",
      kind: "Registered pickup",
      route: "",
    })),
    ...agency.dropoffs.map((name) => ({
      id: `d-${name}`,
      name,
      address: "",
      kind: "Registered drop-off",
      route: "",
    })),
  ].filter(
    (p) =>
      !points.some(
        (x) =>
          x.kind ===
            (p.kind === "Registered pickup"
              ? "Departure pickup"
              : "Arrival drop-off") &&
          x.name.trim().toLowerCase() === p.name.trim().toLowerCase(),
      ),
  );
  const hubs = [...points, ...registered];
  return (
    <Panel
      eyebrow="DEPOTS & PICKUP LOCATIONS"
      title="Terminal Hubs & Pick-up Points"
      action={<Warehouse size={22} className={styles.muted} />}
    >
      <div className={styles.hubGrid}>
        {hubs.length ? (
          hubs.map((p) => (
            <article
              className={styles.inset}
              key={`${p.kind}-${p.name}-${p.address}`}
            >
              <div className={styles.hubTag}>{p.kind}</div>
              <h3>{p.name}</h3>
              {p.address && <p className={styles.body}>{p.address}</p>}
              {p.route && <p className={styles.body}>{p.route}</p>}
              <a
                className={styles.textAction}
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(/pakistan/i.test(p.address || p.name) ? p.address || p.name : `${p.address || p.name}, Pakistan`)}`}
              >
                Find on map <ArrowUpRight size={14} />
              </a>
            </article>
          ))
        ) : (
          <article className={styles.inset}>
            <h3>{agency.city || "Driver location"}</h3>
            <p className={styles.body}>
              {agency.address ||
                "Contact your provider to confirm the meeting point for your journey."}
            </p>
          </article>
        )}
      </div>
      <div className={styles.hubNote}>
        <Navigation size={23} />
        <div>
          <p className={styles.eyebrow}>BEFORE YOU TRAVEL</p>
          <h3>Confirm your pickup point and arrival time with the driver.</h3>
          <p>
            Use the location listed on your selected trip when arranging your
            journey.
          </p>
        </div>
      </div>
    </Panel>
  );
}
function Reviews({ providerId }: { providerId: string }) {
  const reviews = useQuery({
    queryKey: ["customer", "agency-reviews", providerId],
    queryFn: () => getAgencyReviews(providerId),
    retry: 1,
  });
  const [rating, setRating] = useState("all"),
    [limit, setLimit] = useState(3);
  const rows = (reviews.data || []).filter(
    (r) => rating === "all" || (rating === "5" ? r.rating >= 5 : r.rating < 5),
  );
  return (
    <Panel
      eyebrow="COMMUNITY TRUST"
      title="Traveler Reviews"
      action={
        <div
          className={styles.reviewTabs}
          role="group"
          aria-label="Filter reviews"
        >
          {[
            ["all", "All"],
            ["5", "5 stars"],
            ["other", "4 stars & below"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={key === rating}
              onClick={() => {
                setRating(key);
                setLimit(3);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {reviews.isPending ? (
        <HomeState
          title="Loading reviews…"
          description="Reading traveler feedback."
          loading
        />
      ) : reviews.isError ? (
        <HomeState
          title="Reviews unavailable"
          description="Traveler reviews could not be loaded."
          retry={() => void reviews.refetch()}
        />
      ) : rows.length ? (
        <>
          <div className={styles.reviewList}>
            {rows.slice(0, limit).map((r) => (
              <article className={styles.inset} key={r.id}>
                <div className={styles.reviewIdentity}>
                  <div className={styles.avatar}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h3>BANJARA traveler</h3>
                    <p>{formatDate(r.createdAt)}</p>
                  </div>
                  <span
                    className={styles.stars}
                    aria-label={`${r.rating} out of 5 stars`}
                  >
                    <Star size={15} fill="currentColor" />
                    {r.rating.toFixed(1)}
                  </span>
                </div>
                <p className={styles.reviewComment}>
                  {r.comment ||
                    "This traveler left a rating without a written review."}
                </p>
                {r.reply && (
                  <div className={styles.reply}>
                    <strong>Provider reply</strong>
                    <p>{r.reply}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
          {rows.length > limit && (
            <button
              className={styles.outline}
              onClick={() => setLimit(limit + 3)}
            >
              Show more reviews
            </button>
          )}
        </>
      ) : (
        <HomeState
          title="No reviews yet"
          description={
            rating === "all"
              ? "Traveler feedback will appear here after this provider is reviewed."
              : "No reviews match this rating filter."
          }
        />
      )}
    </Panel>
  );
}
