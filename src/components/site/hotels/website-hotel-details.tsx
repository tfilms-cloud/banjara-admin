"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@/lib/live-query";
import { BackendData } from '@/components/site/backend-data';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Home,
  Info,
  Mail,
  MapPin,
  Mountain,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  Users,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import {
  HomeDialog,
  HomeImage,
  HomeState,
} from "@/components/site/home/home-primitives";
import { useHotelFavorites } from "@/hooks/use-hotel-favorites";
import { roomDetailsHref } from "@/lib/room-details";
import {
  hotelMapLinks,
  hotelPhotos,
  nextStayDate,
  publicWebsite,
  stayNights,
  validateHotelStay,
} from "@/lib/hotel-details";
import {
  getHotelQuote,
  getHotelReviews,
  getHotelRooms,
} from "@/services/customer/hotel.service";
import type {
  Hotel,
  HotelQuoteInput,
  HotelReview,
  HotelRoom,
  HotelStay,
} from "@/types/customer/hotel";
import { amenityIcon, HotelGallery, HotelRoomCard } from "./hotel-primitives";
import styles from "./hotel-details.module.css";

type Props = {
  hotel: Hotel;
  initialRooms?: HotelRoom[];
  initialReviews?: HotelReview[];
  initialStay: HotelStay;
  initialRoomId: string;
  today: string;
};
type Modal =
  | { kind: "gallery" }
  | { kind: "room"; room: HotelRoom }
  | { kind: "share" }
  | { kind: "quote" };
const rupees = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;
export function WebsiteHotelDetails(props: Props) {
  return <BackendData label="Hotel details"><ConnectedHotelDetails {...props} /></BackendData>;
}

function ConnectedHotelDetails({
  hotel,
  initialRooms,
  initialReviews,
  initialStay,
  initialRoomId,
  today,
}: Props) {
  const [stay, setStay] = useState(initialStay);
  const [selectedId, setSelectedId] = useState(initialRoomId);
  const [modal, setModal] = useState<Modal | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [quoteInput, setQuoteInput] = useState<HotelQuoteInput | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const favorites = useHotelFavorites();
  const stayError = validateHotelStay(stay, today);
  const roomQuery = useQuery({
    queryKey: ["customer", "hotel-rooms", hotel.id, stay],
    queryFn: () => getHotelRooms(hotel.id, stay),
    enabled: !stayError,
    initialData:
      JSON.stringify(stay) === JSON.stringify(initialStay)
        ? initialRooms
        : undefined,
    staleTime: 15000,
    refetchInterval: 60000,
  });
  const reviewQuery = useQuery({
    queryKey: ["customer", "hotel-reviews", hotel.providerId],
    queryFn: () => getHotelReviews(hotel.providerId ?? ""),
    initialData: initialReviews,
    staleTime: 60000,
  });
  const quoteQuery = useQuery({
    queryKey: ["customer", "hotel-quote", quoteInput],
    queryFn: () => getHotelQuote(quoteInput!),
    enabled: !!quoteInput,
    staleTime: 0,
    retry: false,
  });
  const rooms = stayError ? [] : (roomQuery.data ?? []);
  const selectedRoom = rooms.find((room) => room.id === selectedId) ?? rooms[0];
  const photos = hotelPhotos(hotel, initialRooms ?? rooms);
  const nights = stayNights(stay.checkIn, stay.checkOut);
  const estimate =
    (selectedRoom?.pricePerNight ?? hotel.priceFrom) *
    Math.max(nights, 0) *
    stay.rooms;
  const selectedQuote =
    quoteInput &&
    quoteInput.roomId === selectedRoom?.id &&
    quoteInput.checkIn === stay.checkIn &&
    quoteInput.checkOut === stay.checkOut &&
    quoteInput.rooms === stay.rooms &&
    quoteInput.guests === stay.adults + stay.children
      ? quoteQuery.data
      : undefined;
  const maps = hotelMapLinks(hotel);
  const website = publicWebsite(hotel.website);
  const phone = hotel.phone.replace(/[^+\d]/g, "");
  const reviews = reviewQuery.data ?? [];
  const hostRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const rating = hotel.rating;
  const reviewCount = hotel.reviewCount;
  const unavailable =
    hotel.status === "inactive" ||
    hotel.status === "draft" ||
    ["pending", "rejected", "suspended", "changes_requested"].includes(
      hotel.approvalStatus ?? "",
    );
  const query = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
    children: String(stay.children),
    rooms: String(stay.rooms),
    destination: hotel.location.city,
  });
  if (selectedRoom) query.set("roomId", selectedRoom.id);
  const syncUrl = (next: HotelStay, roomId = selectedId) => {
    if (validateHotelStay(next, today)) return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([key, value]) =>
      params.set(key, String(value)),
    );
    if (roomId) params.set("roomId", roomId);
    window.history.replaceState(null, "", `/hotels/${hotel.id}?${params}`);
  };
  const updateStay = (patch: Partial<HotelStay>) => {
    const next = { ...stay, ...patch };
    if (patch.checkIn && next.checkOut <= patch.checkIn)
      next.checkOut = nextStayDate(patch.checkIn);
    setStay(next);
    setQuoteInput(null);
    syncUrl(next);
  };
  const selectRoom = (room: HotelRoom) => {
    setSelectedId(room.id);
    setQuoteInput(null);
    setModal(null);
    syncUrl(stay, room.id);
    document
      .getElementById("hotel-room-selection")
      ?.focus({ preventScroll: true });
  };
  const checkAvailability = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoom || unavailable) return;
    const form = new FormData(event.currentTarget);
    const submitted = {
      checkIn: String(form.get("checkIn")),
      checkOut: String(form.get("checkOut")),
      adults: Number(form.get("adults")),
      children: Number(form.get("children")),
      rooms: Number(form.get("rooms")),
    };
    setStay(submitted);
    if (validateHotelStay(submitted, today)) return;
    syncUrl(submitted, selectedRoom.id);
    const input = {
      hotelId: hotel.id,
      roomId: selectedRoom.id,
      checkIn: submitted.checkIn,
      checkOut: submitted.checkOut,
      rooms: submitted.rooms,
      guests: submitted.adults + submitted.children,
    };
    if (JSON.stringify(input) === JSON.stringify(quoteInput))
      void quoteQuery.refetch();
    else setQuoteInput(input);
    setModal({ kind: "quote" });
  };
  const openGallery = (index: number) => {
    setPhotoIndex(index);
    setModal({ kind: "gallery" });
  };
  const highlights = [
    ...(hotel.cancellationPolicy
      ? [
          {
            icon: CalendarCheck,
            title: "Property cancellation policy",
            text: hotel.cancellationPolicy,
          },
        ]
      : []),
    ...hotel.amenities
      .slice(0, hotel.cancellationPolicy ? 3 : 4)
      .map((amenity) => ({
        icon: amenityIcon(amenity),
        title: amenity,
        text: "Listed by your property host.",
      })),
  ];
  const scrollRooms = () =>
    document
      .getElementById("available-hotel-rooms")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">
              <Home size={13} />
              Home
            </Link>
            <span>/</span>
            <Link href="/explore?service=hotels">Stays & Lodges</Link>
            <span>/</span>
            <Link
              href={`/explore?service=hotels&destination=${encodeURIComponent(hotel.location.city)}`}
            >
              {hotel.location.city || "Properties"}
            </Link>
            <span>/</span>
            <strong>{hotel.name}</strong>
          </nav>
          <div className={styles.topActions}>
            <button
              type="button"
              onClick={() => {
                setShareUrl(
                  `${window.location.origin}/hotels/${hotel.id}?${query}`,
                );
                setModal({ kind: "share" });
              }}
            >
              <Share2 size={16} />
              Share
            </button>
            <button
              type="button"
              aria-pressed={favorites.saved.has(hotel.id)}
              disabled={favorites.pending}
              onClick={() => favorites.toggle(hotel.id)}
            >
              <Heart
                size={16}
                fill={favorites.saved.has(hotel.id) ? "currentColor" : "none"}
              />
              {favorites.saved.has(hotel.id)
                ? "Saved to Wishlist"
                : "Save to Wishlist"}
            </button>
          </div>
        </div>
        <header className={styles.propertyHeader}>
          <div>
            <div className={styles.badges}>
              <span>
                <Mountain size={13} />
                {hotel.hotelType.replace(/_/g, " ")}
              </span>
              {hotel.isVerified && (
                <span>
                  <ShieldCheck size={13} />
                  Verified property
                </span>
              )}
              {hotel.businessRegistered && (
                <span>
                  <BadgeCheck size={13} />
                  Registered business
                </span>
              )}
              {hotel.restaurantAvailable && (
                <span>
                  <Utensils size={13} />
                  On-site dining
                </span>
              )}
            </div>
            <h1>{hotel.name}</h1>
            <div className={styles.propertyMeta}>
              <a href="#hotel-reviews">
                <Star size={16} fill="currentColor" />
                {rating > 0 ? rating.toFixed(1) : "New stay"}
                <span>
                  {reviewCount > 0
                    ? `(${reviewCount} reviews)`
                    : "No reviews yet"}
                </span>
              </a>
              <span className={styles.metaDivider}>•</span>
              <a href={maps.external} target="_blank" rel="noreferrer">
                <MapPin size={16} />
                {hotel.location.address ||
                  hotel.location.area ||
                  hotel.location.city}
              </a>
            </div>
          </div>
          <span className={styles.headerNote}>
            <MapPin size={20} />
            <span>
              YOUR DESTINATION<strong>{hotel.location.city}</strong>
            </span>
          </span>
        </header>
        <HotelGallery name={hotel.name} photos={photos} onOpen={openGallery} />
        <div className={styles.contentGrid}>
          <div className={styles.detailsColumn}>
            <section
              className={styles.hostCard}
              aria-label="Your property host"
            >
              <span className={styles.hostAvatar}>
                {(hotel.managerName || hotel.name).charAt(0)}
                {hotel.isVerified && <BadgeCheck size={17} />}
              </span>
              <div>
                <h2>
                  {hotel.managerName
                    ? `Hosted by ${hotel.managerName}`
                    : hotel.name}
                  {hotel.isVerified && <span>Verified host</span>}
                </h2>
                <p>
                  {hotel.yearsExperience
                    ? `${hotel.yearsExperience} years in hospitality · `
                    : ""}
                  {hotel.location.city}
                </p>
              </div>
              <a href={phone ? `tel:${phone}` : "#property-contact"}>
                <span />
                Contact the property
              </a>
            </section>
            {highlights.length > 0 && (
              <div className={styles.highlightGrid}>
                {highlights.map((item) => (
                  <article key={item.title}>
                    <span>
                      <item.icon size={23} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <section className={styles.panel}>
              <h2>About {hotel.name}</h2>
              <p className={styles.description}>
                {hotel.description ||
                  "Your host is preparing the property description. Contact the property for more details about your stay."}
              </p>
            </section>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>Amenities & Facilities</h2>
                <span>From the property</span>
              </div>
              {hotel.amenities.length ? (
                <div className={styles.amenityGrid}>
                  {hotel.amenities.map((amenity, index) => {
                    const Icon = amenityIcon(amenity);
                    return (
                      <span key={`${amenity}${index}`}>
                        <Icon size={20} />
                        {amenity}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.muted}>
                  Amenities have not been published yet.
                </p>
              )}
            </section>
            <section className={styles.panel} id="available-hotel-rooms">
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Available Rooms & Suites</h2>
                  <p>
                    Rates for {stay.checkIn} – {stay.checkOut}
                  </p>
                </div>
                <span className={styles.roomCount}>
                  {rooms.length}{" "}
                  {rooms.length === 1 ? "room option" : "room options"}
                </span>
              </div>
              {stayError ? (
                <HomeState
                  title="Choose your travel dates"
                  description={stayError}
                />
              ) : roomQuery.isPending ? (
                <HomeState
                  loading
                  title="Finding available rooms…"
                  description="Checking your dates and guests."
                />
              ) : roomQuery.isError ? (
                <HomeState
                  title="Rooms could not be loaded"
                  description="Please try loading availability again."
                  retry={() => {
                    void roomQuery.refetch();
                  }}
                />
              ) : rooms.length ? (
                <div className={styles.roomList}>
                  {rooms.map((room) => (
                    <HotelRoomCard
                      key={room.id}
                      room={room}
                      selected={selectedRoom?.id === room.id}
                      onSelect={() => selectRoom(room)}
                      detailsHref={roomDetailsHref(room, stay)}
                    />
                  ))}
                </div>
              ) : (
                <HomeState
                  title="No rooms available for this stay"
                  description="Try different dates, fewer guests, or fewer rooms."
                />
              )}
            </section>
            <section className={styles.panel}>
              <h2 className={styles.iconHeading}>
                <Info size={20} />
                Property Policies
              </h2>
              <div className={styles.policyGrid}>
                <article>
                  <small>CHECK-IN / OUT</small>
                  <strong>
                    {hotel.checkInTime} / {hotel.checkOutTime}
                  </strong>
                  <p>Confirm arrival arrangements with your host.</p>
                </article>
                <article>
                  <small>CANCELLATION</small>
                  <p>
                    {hotel.cancellationPolicy ||
                      "Contact the property for its cancellation policy."}
                  </p>
                </article>
                <article>
                  <small>TRAVEL TO THE PROPERTY</small>
                  <p>
                    Confirm the route, vehicle access, and any seasonal
                    requirements before departure.
                  </p>
                </article>
              </div>
            </section>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Location & Surroundings</h2>
                  <p>{hotel.location.address || hotel.location.city}</p>
                </div>
                {phone && (
                  <a className={styles.softButton} href={`tel:${phone}`}>
                    <Phone size={13} />
                    Front Desk
                  </a>
                )}
              </div>
              {maps.embed ? (
                <div className={styles.mapFrame}>
                  <iframe
                    title={`${hotel.name} property location`}
                    src={maps.embed}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <a href={maps.external} target="_blank" rel="noreferrer">
                    <MapPin size={16} />
                    <span>
                      {hotel.name}
                      <small>{hotel.location.city} · Open directions</small>
                    </span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              ) : (
                <a
                  href={maps.external}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapFallback}
                >
                  <MapPin size={30} />
                  Open property location in Maps
                  <ArrowRight size={16} />
                </a>
              )}
            </section>
            <section className={styles.panel} id="hotel-reviews">
              <div className={styles.sectionHeading}>
                <div>
                  <h2 className={styles.reviewTitle}>
                    {hostRating > 0 && (
                      <>
                        <strong>{hostRating.toFixed(1)}</strong>
                        <Star size={20} fill="currentColor" />
                      </>
                    )}
                    Property Host Reviews
                  </h2>
                  <p>
                    {reviews.length > 0
                      ? `${reviews.length} published hotel-stay reviews for this host`
                      : "Be among the first guests to share a review."}
                  </p>
                </div>
              </div>
              {reviewQuery.isPending ? (
                <p>Loading guest reviews…</p>
              ) : reviewQuery.isError ? (
                <HomeState
                  title="Reviews are temporarily unavailable"
                  description="Please try again."
                  retry={() => {
                    void reviewQuery.refetch();
                  }}
                />
              ) : reviews.length ? (
                <>
                  <div className={styles.reviewList}>
                    {reviews
                      .slice(0, showAllReviews ? reviews.length : 3)
                      .map((review, index) => (
                        <article key={review.id}>
                          <div>
                            <span className={styles.reviewAvatar}>G</span>
                            <div>
                              <h3>Guest review {index + 1}</h3>
                              <small>
                                {new Date(review.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    month: "long",
                                    year: "numeric",
                                    timeZone: "Asia/Karachi",
                                  },
                                )}
                              </small>
                            </div>
                            <strong>
                              <Star size={14} fill="currentColor" />
                              {review.rating.toFixed(1)}
                            </strong>
                          </div>
                          <p>
                            {review.comment ||
                              "This guest left a rating without a written review."}
                          </p>
                          {review.providerReply && (
                            <p className={styles.reply}>
                              <strong>Property reply:</strong>{" "}
                              {review.providerReply}
                            </p>
                          )}
                        </article>
                      ))}
                  </div>
                  {reviews.length > 3 && (
                    <button
                      className={styles.softButton}
                      type="button"
                      onClick={() => setShowAllReviews(!showAllReviews)}
                    >
                      {showAllReviews
                        ? "Show fewer reviews"
                        : `Show all ${reviews.length} reviews`}
                    </button>
                  )}
                </>
              ) : (
                <p className={styles.muted}>
                  No written reviews have been published for this property’s
                  provider yet.
                </p>
              )}
            </section>
          </div>
          <aside className={styles.sidebar} aria-label="Plan your stay">
            <form className={styles.bookingPanel} onSubmit={checkAvailability}>
              <div className={styles.priceHeading}>
                <div>
                  <small>STARTING RATE</small>
                  <p>
                    <strong>
                      {rupees(selectedRoom?.pricePerNight ?? hotel.priceFrom)}
                    </strong>
                    <span> / night</span>
                  </p>
                </div>
                {hotel.isVerified && (
                  <span>
                    <BadgeCheck size={12} />
                    Verified property
                  </span>
                )}
              </div>
              <div className={styles.dateFields}>
                <CalendarDays size={19} />
                <div>
                  <label>
                    Check-in
                    <input
                      type="date"
                      name="checkIn"
                      min={today}
                      value={stay.checkIn}
                      required
                      onInput={(e) =>
                        updateStay({ checkIn: e.currentTarget.value })
                      }
                      onChange={(e) => updateStay({ checkIn: e.target.value })}
                    />
                  </label>
                  <label>
                    Check-out
                    <input
                      type="date"
                      name="checkOut"
                      min={stay.checkIn ? nextStayDate(stay.checkIn) : today}
                      value={stay.checkOut}
                      required
                      onInput={(e) =>
                        updateStay({ checkOut: e.currentTarget.value })
                      }
                      onChange={(e) => updateStay({ checkOut: e.target.value })}
                    />
                  </label>
                </div>
                <span>{nights > 0 ? `${nights} nights` : "Choose dates"}</span>
              </div>
              <fieldset className={styles.guestFields}>
                <legend>
                  <Users size={17} />
                  TRAVELERS
                </legend>
                <label>
                  Adults
                  <select
                    name="adults"
                    value={stay.adults}
                    onChange={(e) =>
                      updateStay({ adults: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Children
                  <select
                    name="children"
                    value={stay.children}
                    onChange={(e) =>
                      updateStay({ children: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 21 }, (_, i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Rooms
                  <select
                    name="rooms"
                    value={stay.rooms}
                    onChange={(e) =>
                      updateStay({ rooms: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
              </fieldset>
              <label className={styles.roomSelection}>
                ROOM SELECTION
                <select
                  id="hotel-room-selection"
                  value={selectedRoom?.id ?? ""}
                  disabled={
                    !rooms.length || roomQuery.isPending || roomQuery.isError
                  }
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setQuoteInput(null);
                    syncUrl(stay, e.target.value);
                  }}
                  aria-label="Room selection"
                >
                  {!rooms.length && (
                    <option value="">No rooms available</option>
                  )}
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({rupees(room.pricePerNight)}/night)
                    </option>
                  ))}
                </select>
              </label>
              {stayError && (
                <p className={styles.error} role="alert">
                  {stayError}
                </p>
              )}
              {unavailable && (
                <p className={styles.error} role="alert">
                  This property is not accepting reservations right now.
                </p>
              )}
              <button
                type="submit"
                className={styles.reserveButton}
                disabled={
                  !!stayError ||
                  !selectedRoom ||
                  roomQuery.isPending ||
                  roomQuery.isError ||
                  unavailable
                }
              >
                Check availability
                <ArrowRight size={18} />
              </button>
              <p className={styles.bookingHint}>
                Check your dates and rate before contacting the property. No
                charge or reservation is made at this step.
              </p>
              <div className={styles.priceBreakdown}>
                <div>
                  <span>
                    {stay.rooms} {stay.rooms === 1 ? "room" : "rooms"} ×{" "}
                    {Math.max(nights, 0)} nights
                  </span>
                  <strong>{rupees(selectedQuote?.subtotal ?? estimate)}</strong>
                </div>
                <div>
                  <span>Taxes & additional charges</span>
                  <span>Confirm with host</span>
                </div>
                <div className={styles.total}>
                  <strong>
                    {selectedQuote
                      ? "Quoted room subtotal"
                      : "Estimated room subtotal"}
                  </strong>
                  <strong>{rupees(selectedQuote?.subtotal ?? estimate)}</strong>
                </div>
              </div>
              <p className={styles.quoteNote}>
                <ShieldCheck size={17} />
                {selectedQuote
                  ? "Availability and nightly rates checked for your dates."
                  : "Availability and rates are checked again when you request a quote."}
              </p>
              <button
                type="button"
                className={styles.browseRooms}
                onClick={scrollRooms}
              >
                Compare room options
                <ArrowRight size={14} />
              </button>
            </form>
            <section className={styles.contactPanel} id="property-contact">
              <h2>
                Questions before booking?
                <Phone size={17} />
              </h2>
              <p>
                Contact the property about arrival, room preferences, or your
                reservation.
              </p>
              <div>
                {phone && (
                  <a className={styles.softButton} href={`tel:${phone}`}>
                    <Phone size={15} />
                    Call the property
                  </a>
                )}
                {hotel.email && (
                  <a
                    className={styles.softButton}
                    href={`mailto:${hotel.email}`}
                  >
                    <Mail size={15} />
                    Email the host
                  </a>
                )}
                {website && (
                  <a
                    className={styles.softButton}
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit property website
                    <ArrowRight size={14} />
                  </a>
                )}
                {!phone && !hotel.email && !website && (
                  <p>Contact details have not been published yet.</p>
                )}
              </div>
              <Link href={`/explore?service=hotels&${query}`}>
                <ArrowLeft size={14} />
                Back to stays
              </Link>
            </section>
          </aside>
        </div>
      </div>
      {modal && (
        <HomeDialog
          title={
            modal.kind === "gallery"
              ? `${hotel.name} · Photos`
              : modal.kind === "room"
                ? modal.room.name
                : modal.kind === "share"
                  ? "Share this stay"
                  : "Availability & room quote"
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "gallery" ? (
            <div className={styles.photoDialog}>
              <HomeImage
                src={photos[photoIndex]}
                alt={`${hotel.name} · photo ${photoIndex + 1}`}
              />
              <div>
                <button
                  type="button"
                  className={styles.softButton}
                  onClick={() =>
                    setPhotoIndex(
                      (photoIndex - 1 + photos.length) % photos.length,
                    )
                  }
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {photoIndex + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  className={styles.softButton}
                  onClick={() =>
                    setPhotoIndex((photoIndex + 1) % photos.length)
                  }
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className={styles.photoThumbs}>
                {photos.map((photo, index) => (
                  <button
                    type="button"
                    key={photo}
                    aria-label={`Show photo ${index + 1}`}
                    aria-pressed={photoIndex === index}
                    onClick={() => setPhotoIndex(index)}
                  >
                    <HomeImage src={photo} alt="" />
                  </button>
                ))}
              </div>
            </div>
          ) : modal.kind === "room" ? (
            <div className={styles.roomDialog}>
              <HomeImage src={modal.room.images[0]} alt={modal.room.name} />
              <p>{modal.room.description}</p>
              <div className={styles.tags}>
                <span>{modal.room.bedType}</span>
                <span>Up to {modal.room.capacity} guests</span>
                {modal.room.sizeSqm > 0 && <span>{modal.room.sizeSqm} m²</span>}
                {modal.room.amenities.map((amenity, index) => (
                  <span key={`${amenity}${index}`}>{amenity}</span>
                ))}
              </div>
              <p>
                <strong>{rupees(modal.room.pricePerNight)}</strong> / night
              </p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => selectRoom(modal.room)}
              >
                Select this room
                <CheckCircle2 size={16} />
              </button>
            </div>
          ) : modal.kind === "share" ? (
            <div className={styles.shareDialog}>
              <p>Share this property with your travel companions.</p>
              <label>
                Property link
                <input
                  aria-label="Property link"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast.success("Property link copied"))
                    .catch(() =>
                      toast.error("Select and copy the property link."),
                    );
                }}
              >
                <Copy size={16} />
                Copy link
              </button>
            </div>
          ) : (
            <div className={styles.quoteDialog}>
              {quoteQuery.isPending ? (
                <HomeState
                  loading
                  title="Checking your room…"
                  description="Getting current availability and nightly rates."
                />
              ) : quoteQuery.isError ? (
                <HomeState
                  title="This room could not be confirmed"
                  description={quoteQuery.error.message}
                  retry={() => {
                    void quoteQuery.refetch();
                  }}
                />
              ) : quoteQuery.data && quoteInput ? (
                <>
                  <p className={styles.quoteSuccess}>
                    <CheckCircle2 size={20} />
                    Available for your selected dates
                  </p>
                  <h3>{selectedRoom?.name}</h3>
                  <p>
                    {quoteInput.checkIn} – {quoteInput.checkOut} ·{" "}
                    {quoteInput.guests} guests · {quoteInput.rooms}{" "}
                    {quoteInput.rooms === 1 ? "room" : "rooms"}
                  </p>
                  <div className={styles.quoteRates}>
                    {quoteQuery.data.nightlyRates.map((night) => (
                      <div key={night.date}>
                        <span>{night.date}</span>
                        <strong>{rupees(night.rate)} / room</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.quoteTotal}>
                    <strong>Room subtotal</strong>
                    <strong>{rupees(quoteQuery.data.subtotal)}</strong>
                  </div>
                  <p>
                    Contact the property to reserve this room and confirm taxes,
                    additional charges and payment arrangements. This
                    availability check does not hold a room.
                  </p>
                  <div className={styles.dialogActions}>
                    {phone && (
                      <a className={styles.primary} href={`tel:${phone}`}>
                        <Phone size={16} />
                        Call to reserve
                      </a>
                    )}
                    {hotel.email && (
                      <a
                        className={styles.softButton}
                        href={`mailto:${hotel.email}?subject=${encodeURIComponent(`Room enquiry: ${hotel.name}`)}`}
                      >
                        <Mail size={16} />
                        Email property
                      </a>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </HomeDialog>
      )}
    </div>
  );
}
