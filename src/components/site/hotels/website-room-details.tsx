"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@/lib/live-query";
import { BackendData } from '@/components/site/backend-data';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Copy,
  Flame,
  Heart,
  House,
  Images,
  Info,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  Mountain,
  Phone,
  Plus,
  Share2,
  ShieldCheck,
  ShowerHead,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  HomeDialog,
  HomeImage,
  HomeState,
} from "@/components/site/home/home-primitives";
import { useHotelFavorites } from "@/hooks/use-hotel-favorites";
import {
  nextStayDate,
  stayNights,
  validateHotelStay,
} from "@/lib/hotel-details";
import {
  groupRoomAmenities,
  roomAbout,
  roomAvailabilityError,
  roomDetailsHref,
  roomSelectionHref,
  roomSizeLabel,
  roomStayQuery,
} from "@/lib/room-details";
import {
  getHotelQuote,
  getHotelRooms,
} from "@/services/customer/hotel.service";
import type {
  Hotel,
  HotelQuoteInput,
  HotelRoom,
  HotelStay,
} from "@/types/customer/hotel";
import { HotelGallery } from "./hotel-primitives";
import hotelStyles from "./hotel-details.module.css";
import styles from "./room-details.module.css";

type Props = {
  hotel: Hotel;
  room: HotelRoom;
  initialStay: HotelStay;
  today: string;
  initialAvailableRooms?: HotelRoom[];
  initialCatalog?: HotelRoom[];
};
type Modal = "photos" | "share" | "stay" | "quote" | null;
const money = (value: number) => `Rs ${value.toLocaleString("en-PK")}`;
const groupIcons: Record<string, LucideIcon> = {
  "Sleeping & Comfort": BedDouble,
  "Heating & Climate": Flame,
  "Bathroom & Grooming": ShowerHead,
  "Tech & Connectivity": Wifi,
  "Dining & Refreshments": Coffee,
  "Outdoor & Views": Mountain,
};

function RoomPanel({
  title,
  icon: Icon,
  accessory,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accessory?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h2>
          <Icon size={20} />
          {title}
        </h2>
        {accessory}
      </div>
      {children}
    </section>
  );
}

export function WebsiteRoomDetails(props: Props) {
  return <BackendData label="Room details"><ConnectedRoomDetails {...props} /></BackendData>;
}

function ConnectedRoomDetails({
  hotel,
  room,
  initialStay,
  today,
  initialAvailableRooms,
  initialCatalog,
}: Props) {
  const [stay, setStay] = useState(initialStay);
  const [draftStay, setDraftStay] = useState(initialStay);
  const [modal, setModal] = useState<Modal>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [quoteInput, setQuoteInput] = useState<HotelQuoteInput | null>(null);
  const favorites = useHotelFavorites();
  const stayError = validateHotelStay(stay, today);
  const availability = useQuery({
    queryKey: ["customer", "hotel-rooms", hotel.id, stay],
    queryFn: () => getHotelRooms(hotel.id, stay),
    initialData:
      JSON.stringify(stay) === JSON.stringify(initialStay)
        ? initialAvailableRooms
        : undefined,
    enabled: !stayError,
    staleTime: 15000,
    refetchInterval: 60000,
  });
  const catalog = useQuery({
    queryKey: ["customer", "hotel-room-catalog", hotel.id],
    queryFn: () => getHotelRooms(hotel.id),
    initialData: initialCatalog,
    staleTime: 60000,
  });
  const quote = useQuery({
    queryKey: ["customer", "hotel-quote", quoteInput],
    queryFn: () => getHotelQuote(quoteInput!),
    enabled: !!quoteInput,
    retry: false,
    staleTime: 0,
  });
  const availableRoom = availability.data?.find(
    (candidate) => candidate.id === room.id && candidate.hotelId === hotel.id,
  );
  const propertyClosed =
    ["inactive", "draft"].includes(hotel.status ?? "") ||
    ["pending", "rejected", "suspended", "changes_requested"].includes(
      hotel.approvalStatus ?? "",
    );
  const bookingError =
    stayError ||
    (propertyClosed
      ? "This property is not accepting reservations."
      : roomAvailabilityError(room, stay, availableRoom));
  const canCheck =
    !bookingError &&
    !availability.isPending &&
    !availability.isError &&
    !availability.isFetching;
  const photos = [...new Set(room.images.filter(Boolean))];
  const nights = stayNights(stay.checkIn, stay.checkOut);
  const rate = availableRoom?.pricePerNight ?? room.pricePerNight;
  const rateKnown = Number.isFinite(rate) && rate >= 0;
  const estimate = rateKnown ? rate * nights * stay.rooms : 0;
  const quoted =
    quoteInput &&
    quote.data &&
    !quote.isError &&
    quoteInput.checkIn === stay.checkIn &&
    quoteInput.checkOut === stay.checkOut &&
    quoteInput.rooms === stay.rooms &&
    quoteInput.guests === stay.adults + stay.children
      ? quote.data
      : undefined;
  const count =
    !availability.isFetching && !availability.isError && availableRoom
      ? Math.max(0, Math.floor(availableRoom.availableRooms))
      : undefined;
  const alternatives = (catalog.data ?? [])
    .filter(
      (candidate) => candidate.id !== room.id && candidate.hotelId === hotel.id,
    )
    .slice(0, 3);
  const groups = groupRoomAmenities(room.amenities);
  const heating = room.amenities.filter((value) =>
    /heat|bukhari|fire|air.?con|\bac\b|fan/i.test(value),
  );
  const cancellation = room.cancellationPolicy || hotel.cancellationPolicy;
  const phone = hotel.phone.replace(/[^+\d]/g, "");
  const backHref = roomSelectionHref(room, stay);
  const availabilityBadge = availability.isError
    ? "Availability unavailable"
    : availability.isFetching
      ? "Checking availability…"
      : bookingError
        ? "Try other dates"
        : `${count ?? 0} ${count === 1 ? "room" : "rooms"} available`;
  const badges: { label: string; icon: LucideIcon; aqua?: boolean }[] = [
    ...(room.breakfastIncluded
      ? [{ label: "Breakfast included", icon: Utensils, aqua: true }]
      : []),
    ...(room.freeCancellation
      ? [{ label: "Free cancellation", icon: CalendarCheck }]
      : []),
    ...room.amenities
      .filter((value) => /wi.?fi|internet/i.test(value))
      .slice(0, 1)
      .map((label) => ({ label, icon: Wifi })),
  ];
  const openDates = () => {
    setDraftStay(stay);
    setModal("stay");
  };
  const updateDraftStay = (patch: Partial<HotelStay>) => {
    setDraftStay((current) => {
      const next = { ...current, ...patch };
      if (patch.checkIn && next.checkOut <= patch.checkIn)
        next.checkOut = nextStayDate(patch.checkIn);
      return next;
    });
  };
  const updateStay = (next: HotelStay) => {
    setStay(next);
    setQuoteInput(null);
    window.history.replaceState(null, "", roomDetailsHref(room, next));
  };
  const submitStay = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validateHotelStay(draftStay, today)) return;
    updateStay(draftStay);
    setModal(null);
  };
  const requestQuote = () => {
    if (!canCheck) return;
    const input = {
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      rooms: stay.rooms,
      guests: stay.adults + stay.children,
    };
    if (JSON.stringify(input) === JSON.stringify(quoteInput))
      void quote.refetch();
    else setQuoteInput(input);
    setModal("quote");
  };
  const photoControls = (
    <div className={styles.photoControls}>
      <button
        type="button"
        onClick={() =>
          setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)
        }
        aria-label="Previous room photo"
        disabled={photos.length < 2}
      >
        <ChevronLeft size={20} />
      </button>
      <span>
        {photoIndex + 1} / {photos.length}
      </span>
      <button
        type="button"
        onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}
        aria-label="Next room photo"
        disabled={photos.length < 2}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );

  return (
    <div className={`${hotelStyles.page} ${styles.page}`}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/explore?service=stay">Explore</Link>
            <span>›</span>
            <Link href={`/hotels/${hotel.id}?${roomStayQuery(stay)}`}>
              {hotel.name}
            </Link>
            <span>›</span>
            <span aria-current="page">{room.name}</span>
          </nav>
          <Link href={backHref} className={styles.back}>
            <ArrowLeft size={15} />
            Back to all rooms at {hotel.name}
          </Link>
        </div>
        <header className={styles.heading}>
          <p className={styles.location}>
            <MapPin size={14} />
            {[
              hotel.location.address || hotel.location.area,
              hotel.location.city,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <h1>{room.name}</h1>
          <p className={styles.summary}>
            {[
              room.roomType?.replace(/_/g, " "),
              room.bedType,
              room.capacity > 0 ? `Up to ${room.capacity} guests` : "",
              room.sizeSqm > 0 ? roomSizeLabel(room) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className={styles.headingBottom}>
            <div className={styles.badges}>
              {badges.map(({ label, icon: Icon, aqua }) => (
                <span key={label} data-aqua={aqua}>
                  <Icon size={13} />
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.actions}>
              <span className={styles.stock} aria-live="polite">
                {availabilityBadge}
              </span>
              <button
                type="button"
                aria-label="Share room"
                onClick={() => {
                  setShareUrl(window.location.href);
                  setModal("share");
                }}
              >
                <Share2 size={18} />
              </button>
              <button
                type="button"
                aria-label={
                  favorites.saved.has(hotel.id)
                    ? "Unsave property"
                    : "Save property"
                }
                aria-pressed={favorites.saved.has(hotel.id)}
                disabled={favorites.pending}
                onClick={() => favorites.toggle(hotel.id)}
              >
                <Heart
                  size={19}
                  fill={favorites.saved.has(hotel.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>
        </header>
        <div className={styles.galleryFrame}>
          <HotelGallery
            photos={photos}
            name={room.name}
            subject="room"
            onOpen={(index) => {
              setPhotoIndex(index);
              setModal("photos");
            }}
          />
        </div>
        <div className={styles.contentGrid}>
          <div className={styles.details}>
            <div className={styles.specs}>
              {[
                {
                  icon: BedDouble,
                  title: "Bed Setup",
                  value: room.bedType || "Confirm with the property",
                },
                {
                  icon: Users,
                  title: "Capacity",
                  value:
                    room.capacity > 0
                      ? `Up to ${room.capacity} guests per room`
                      : "Confirm with the property",
                },
                {
                  icon: Maximize2,
                  title: "Room Size",
                  value: roomSizeLabel(room),
                },
                {
                  icon: Flame,
                  title: "Climate & Heating",
                  value:
                    heating.join(" · ") ||
                    "Ask your host about heating and cooling",
                },
              ].map(({ icon: Icon, title, value }) => (
                <article key={title}>
                  <span>
                    <Icon size={21} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{value}</p>
                  </div>
                </article>
              ))}
            </div>
            <RoomPanel title="About this Room" icon={House}>
              <div className={styles.description}>
                {roomAbout(room)
                  .split(/\n+/)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>ROOM TYPE</dt>
                  <dd>{room.roomType?.replace(/_/g, " ") || "Guest room"}</dd>
                </div>
                <div>
                  <dt>PROPERTY</dt>
                  <dd>{hotel.hotelType.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt>LOCATION</dt>
                  <dd>{hotel.location.city}</dd>
                </div>
                <div>
                  <dt>BREAKFAST</dt>
                  <dd>
                    {room.breakfastIncluded ? "Included" : "Not included"}
                  </dd>
                </div>
              </dl>
            </RoomPanel>
            <RoomPanel
              title="Complete Room Amenities"
              icon={Coffee}
              accessory={<small>Room features</small>}
            >
              {groups.length ? (
                <div className={styles.amenities}>
                  {groups.map((group) => {
                    const Icon = groupIcons[group.name] ?? CheckCircle2;
                    return (
                      <section key={group.name}>
                        <h3>
                          <Icon size={17} />
                          {group.name}
                        </h3>
                        <ul>
                          {group.items.map((item) => (
                            <li key={item}>
                              <Check size={13} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.muted}>
                  Detailed room amenities have not been published. Contact the
                  host about any specific requirements.
                </p>
              )}
            </RoomPanel>
            <RoomPanel title="Check-in & Property Policies" icon={ShieldCheck}>
              <div className={styles.policies}>
                <section>
                  <h3>
                    <CalendarDays size={17} />
                    Check-in / Check-out
                  </h3>
                  <p>
                    <strong>Check-in:</strong>{" "}
                    {hotel.checkInTime || "Confirm with host"}
                  </p>
                  <p>
                    <strong>Check-out:</strong>{" "}
                    {hotel.checkOutTime || "Confirm with host"}
                  </p>
                  <small>
                    Ask the property about early arrivals and late departures.
                  </small>
                </section>
                <section>
                  <h3>
                    <CalendarCheck size={17} />
                    Cancellation Terms
                  </h3>
                  <p>
                    {cancellation ||
                      "Contact the property for the cancellation policy before reserving."}
                  </p>
                </section>
              </div>
              <p className={styles.policyNote}>
                <Info size={16} />
                Contact the property about children, extra beds, accessibility,
                pets and arrival arrangements.
              </p>
            </RoomPanel>
            <section className={styles.host} aria-label="Property host">
              <span className={styles.hostAvatar}>
                {(hotel.managerName || hotel.name).slice(0, 1)}
              </span>
              <div>
                <h2>
                  {hotel.managerName || hotel.name}{" "}
                  {hotel.isVerified && (
                    <span>
                      <BadgeCheck size={12} />
                      Verified property
                    </span>
                  )}
                </h2>
                <p>
                  {hotel.yearsExperience
                    ? `${hotel.yearsExperience} years in hospitality · `
                    : ""}
                  {hotel.location.city}
                </p>
                <small>
                  Ask about room preferences and arrival arrangements.
                </small>
              </div>
              <div className={styles.hostActions}>
                {hotel.email && (
                  <a
                    href={`mailto:${hotel.email}?subject=${encodeURIComponent(`Room enquiry: ${room.name}`)}`}
                    className={styles.primary}
                  >
                    <Mail size={15} />
                    Email the host
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className={styles.secondary}>
                    <Phone size={14} />
                    Call property
                  </a>
                )}
                {!phone && !hotel.email && (
                  <p>Contact details have not been published.</p>
                )}
              </div>
            </section>
          </div>
          <aside
            className={styles.sidebar}
            aria-label="Room availability and pricing"
          >
            <section className={styles.reservation} id="room-reservation">
              <div className={styles.priceHeading}>
                <p>
                  <strong>{rateKnown ? money(rate) : "Ask property"}</strong>{" "}
                  <span>/ night</span>
                </p>
                <small className={styles.stock}>{availabilityBadge}</small>
              </div>
              <p className={styles.muted}>
                Check your dates for current nightly rates.
              </p>
              <div className={styles.staySummary}>
                <div>
                  <CalendarDays size={17} />
                  <div>
                    <small>
                      DATES ({nights} {nights === 1 ? "NIGHT" : "NIGHTS"})
                    </small>
                    <strong>
                      {stay.checkIn} – {stay.checkOut}
                    </strong>
                  </div>
                  <button type="button" onClick={openDates}>
                    Change
                  </button>
                </div>
                <div>
                  <Users size={17} />
                  <div>
                    <small>GUESTS</small>
                    <strong>
                      {stay.adults} {stay.adults === 1 ? "adult" : "adults"}
                      {stay.children
                        ? ` · ${stay.children} children`
                        : ""} · {stay.rooms}{" "}
                      {stay.rooms === 1 ? "room" : "rooms"}
                    </strong>
                  </div>
                  <button type="button" onClick={openDates}>
                    Modify
                  </button>
                </div>
              </div>
              <div className={styles.quantityRow}>
                <div>
                  <h3>Rooms to Reserve</h3>
                  <small>
                    {count === undefined
                      ? "Check availability for your dates"
                      : `${count} available for this stay`}
                  </small>
                </div>
                <div className={styles.quantity}>
                  <button
                    type="button"
                    aria-label="Remove one room"
                    disabled={stay.rooms <= 1 || availability.isFetching}
                    onClick={() =>
                      updateStay({ ...stay, rooms: stay.rooms - 1 })
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label="Rooms to reserve">{stay.rooms}</output>
                  <button
                    type="button"
                    aria-label="Add one room"
                    disabled={
                      stay.rooms >= 10 ||
                      availability.isFetching ||
                      availability.isError ||
                      (count !== undefined && stay.rooms >= count)
                    }
                    onClick={() =>
                      updateStay({ ...stay, rooms: stay.rooms + 1 })
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              <div className={styles.breakdown}>
                <small>FARE BREAKDOWN</small>
                <div>
                  <span>
                    Room rate{" "}
                    {rateKnown
                      ? `(${money(rate)} × ${nights} nts × ${stay.rooms})`
                      : ""}
                  </span>
                  <strong>
                    {rateKnown
                      ? money(quoted?.subtotal ?? estimate)
                      : "Unavailable"}
                  </strong>
                </div>
                <div>
                  <span>Taxes & additional charges</span>
                  <span>Confirm with host</span>
                </div>
                <div className={styles.total}>
                  <strong>
                    {quoted
                      ? "Quoted room subtotal"
                      : "Estimated room subtotal"}
                  </strong>
                  <strong>
                    {rateKnown ? money(quoted?.subtotal ?? estimate) : "—"}
                  </strong>
                </div>
              </div>
              {availability.isPending || availability.isFetching ? (
                <p className={styles.muted} role="status">
                  Checking room availability…
                </p>
              ) : availability.isError ? (
                <div className={styles.error} role="alert">
                  <p>Availability could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => void availability.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : bookingError ? (
                <p className={styles.error} role="alert">
                  {bookingError}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.primary}
                disabled={!canCheck || quote.isFetching}
                onClick={requestQuote}
              >
                Check room availability <ArrowRight size={18} />
              </button>
              <Link href={backHref} className={styles.secondary}>
                Compare with other rooms
              </Link>
              <div className={styles.reassurance}>
                <p>
                  <ShieldCheck size={16} />
                  {quoted
                    ? "Nightly rates checked for your stay"
                    : "Check your dates to reserve"}
                </p>
                <small>
                  Checking availability does not reserve a room. You reserve
                  on the next step and pay at the property.
                </small>
                {room.freeCancellation && (
                  <p>
                    <CalendarCheck size={15} />
                    Free cancellation · see property terms
                  </p>
                )}
                <p>
                  <CheckCircle2 size={15} />
                  Room details supplied by the property
                </p>
              </div>
              {phone && (
                <div className={styles.callDesk}>
                  <MessageCircle size={18} />
                  <div>
                    <strong>Questions about this room?</strong>
                    <small>Contact the property directly</small>
                  </div>
                  <a href={`tel:${phone}`}>
                    <Phone size={13} />
                    Call
                  </a>
                </div>
              )}
            </section>
          </aside>
        </div>
        <section className={styles.alternatives}>
          <div className={styles.alternativeHeading}>
            <div>
              <small>ALTERNATIVE ACCOMMODATIONS</small>
              <h2>Other Rooms at {hotel.name}</h2>
            </div>
            <Link href={backHref}>
              View all room types <ArrowRight size={16} />
            </Link>
          </div>
          {catalog.isPending ? (
            <HomeState
              loading
              title="Loading room options…"
              description="Finding other rooms at this property."
            />
          ) : catalog.isError ? (
            <HomeState
              title="Room options could not be loaded"
              description="Try again to compare other rooms."
              retry={() => void catalog.refetch()}
            />
          ) : alternatives.length ? (
            <div className={styles.roomGrid}>
              {alternatives.map((other) => (
                <article className={styles.otherRoom} key={other.id}>
                  <Link
                    className={styles.otherPhoto}
                    href={roomDetailsHref(other, stay)}
                    aria-label={`View ${other.name}`}
                  >
                    {other.images[0] ? (
                      <HomeImage src={other.images[0]} alt={other.name} />
                    ) : (
                      <span className={styles.noPhoto}>
                        <Images size={28} />
                        Room photo unavailable
                      </span>
                    )}
                    <small>
                      {other.bedType || other.roomType || "Guest room"}
                    </small>
                  </Link>
                  <div className={styles.otherBody}>
                    <h3>{other.name}</h3>
                    <p>
                      {[
                        other.sizeSqm > 0 ? `${other.sizeSqm} m²` : "",
                        `Up to ${other.capacity} guests`,
                        other.breakfastIncluded ? "Breakfast included" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <footer>
                      <p>
                        <strong>{money(other.pricePerNight)}</strong> / night
                      </p>
                      <Link href={roomDetailsHref(other, stay)}>
                        View details <ArrowRight size={13} />
                      </Link>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>
              No other room types have been published for this property.
            </p>
          )}
        </section>
      </div>
      <div className={styles.mobileBooking}>
        <div>
          <strong>{rateKnown ? money(rate) : "Ask property"}</strong>
          <small> / night</small>
        </div>
        <a href="#room-reservation">
          Plan your stay <ArrowRight size={16} />
        </a>
      </div>
      {modal && (
        <HomeDialog
          title={
            modal === "photos"
              ? `${room.name} · Photos`
              : modal === "share"
                ? "Share this room"
                : modal === "stay"
                  ? "Dates & guests"
                  : "Room availability & quote"
          }
          onClose={() => setModal(null)}
        >
          {modal === "photos" ? (
            <div className={styles.photoDialog}>
              {photos.length > 0 && (
                <HomeImage
                  src={photos[photoIndex]}
                  alt={`${room.name} · photo ${photoIndex + 1}`}
                />
              )}
              {photoControls}
              <div className={styles.thumbnails}>
                {photos.map((photo, index) => (
                  <button
                    type="button"
                    key={photo}
                    aria-label={`Show room photo ${index + 1}`}
                    aria-pressed={index === photoIndex}
                    onClick={() => setPhotoIndex(index)}
                  >
                    <HomeImage src={photo} alt="" />
                  </button>
                ))}
              </div>
            </div>
          ) : modal === "share" ? (
            <div className={styles.shareDialog}>
              <p>Share this room with your travel companions.</p>
              <label>
                Room link
                <input
                  aria-label="Room link"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <button
                type="button"
                className={styles.primary}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast.success("Room link copied"))
                    .catch(() => toast.error("Select and copy the room link."))
                }
              >
                <Copy size={16} />
                Copy link
              </button>
            </div>
          ) : modal === "stay" ? (
            <form className={styles.stayForm} onSubmit={submitStay}>
              <div className={styles.formGrid}>
                <label>
                  Check-in
                  <input
                    type="date"
                    required
                    min={today}
                    value={draftStay.checkIn}
                    onInput={(event) =>
                      updateDraftStay({ checkIn: event.currentTarget.value })
                    }
                    onChange={(event) =>
                      updateDraftStay({ checkIn: event.target.value })
                    }
                  />
                </label>
                <label>
                  Check-out
                  <input
                    type="date"
                    required
                    min={
                      draftStay.checkIn
                        ? nextStayDate(draftStay.checkIn)
                        : today
                    }
                    value={draftStay.checkOut}
                    onInput={(event) =>
                      updateDraftStay({ checkOut: event.currentTarget.value })
                    }
                    onChange={(event) =>
                      updateDraftStay({
                        checkOut: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className={styles.formGrid}>
                {[
                  { key: "adults" as const, label: "Adults", min: 1, max: 30 },
                  {
                    key: "children" as const,
                    label: "Children",
                    min: 0,
                    max: 20,
                  },
                  { key: "rooms" as const, label: "Rooms", min: 1, max: 10 },
                ].map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <select
                      aria-label={field.label}
                      value={draftStay[field.key]}
                      onChange={(event) =>
                        updateDraftStay({
                          [field.key]: Number(event.target.value),
                        })
                      }
                    >
                      {Array.from(
                        { length: field.max - field.min + 1 },
                        (_, index) => (
                          <option key={index} value={field.min + index}>
                            {field.min + index}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ))}
              </div>
              {validateHotelStay(draftStay, today) && (
                <p role="alert" className={styles.error}>
                  {validateHotelStay(draftStay, today)}
                </p>
              )}
              <button
                type="submit"
                className={styles.primary}
                disabled={!!validateHotelStay(draftStay, today)}
              >
                Update stay <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className={styles.quoteDialog}>
              {quote.isFetching ? (
                <HomeState
                  loading
                  title="Checking your room…"
                  description="Getting availability and nightly rates for your stay."
                />
              ) : quote.isError ? (
                <HomeState
                  title="This room could not be confirmed"
                  description={quote.error.message}
                  retry={() => void quote.refetch()}
                />
              ) : quoted && quoteInput ? (
                <>
                  <p className={styles.quoteSuccess}>
                    <CheckCircle2 size={21} />
                    Available for your selected dates
                  </p>
                  <h3>{room.name}</h3>
                  <p>
                    {quoteInput.checkIn} – {quoteInput.checkOut} ·{" "}
                    {quoteInput.guests} guests · {quoteInput.rooms} rooms
                  </p>
                  <div className={styles.quoteRates}>
                    {quoted.nightlyRates.map((night) => (
                      <div key={night.date}>
                        <span>{night.date}</span>
                        <strong>{money(night.rate)} / room</strong>
                      </div>
                    ))}
                    <div>
                      <strong>Room subtotal</strong>
                      <strong>{money(quoted.subtotal)}</strong>
                    </div>
                  </div>
                  <p>
                    Tax and BANJARA’s service fee are added when you reserve.
                    Nothing is paid now: you pay at the property.
                  </p>
                  <Link
                    href={`/hotels/${encodeURIComponent(hotel.id)}/rooms/${encodeURIComponent(room.id)}/book?${roomStayQuery(stay)}`}
                    className={styles.primary}
                  >
                    Reserve this room <ArrowRight size={16} />
                  </Link>
                  {phone && (
                    <a href={`tel:${phone}`} className={styles.secondary}>
                      <Phone size={15} />
                      Call the property
                    </a>
                  )}
                </>
              ) : null}
            </div>
          )}
        </HomeDialog>
      )}
    </div>
  );
}
