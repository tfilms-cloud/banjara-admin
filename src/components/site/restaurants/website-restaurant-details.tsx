"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Copy,
  Croissant,
  Globe,
  Heart,
  Info,
  MapPin,
  MessageSquare,
  Minus,
  Navigation,
  Phone,
  Plus,
  Search,
  Share2,
  Star,
  Tag,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import { customerDel, customerPost } from "@/lib/customer-api";
import { nextStayDate, publicWebsite } from "@/lib/hotel-details";
import {
  DINING_CATEGORIES,
  diningCategory,
  diningEnquiry,
  diningPlanError,
  restaurantMapLinks,
  restaurantPhone,
} from "@/lib/restaurant-details";
import { getCustomerSavedItems } from "@/services/customer/profile.service";
import { getRestaurantById } from "@/services/customer/restaurant.service";
import type {
  DiningPlan,
  RestaurantDetails,
} from "@/types/customer/restaurant";
import { RestaurantGallery, RestaurantImage } from "./restaurant-primitives";
import base from "@/components/site/hotels/hotel-details.module.css";
import styles from "./restaurant-details.module.css";

type Props = {
  id: string;
  initialRestaurant?: RestaurantDetails;
  today: string;
};
export function WebsiteRestaurantDetails({
  id,
  initialRestaurant,
  today,
}: Props) {
  const query = useQuery({
    queryKey: ["customer", "restaurant-details", id],
    queryFn: () => getRestaurantById(id),
    initialData: initialRestaurant,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  return (
    <div className={`${base.page} ${styles.page}`}>
      <div className={styles.container}>
        {query.data ? (
          <RestaurantContent
            key={query.data.id}
            restaurant={query.data}
            today={today}
          />
        ) : (
          <>
            <HomeState
              title={
                query.isPending
                  ? "Loading restaurant…"
                  : "Restaurant details unavailable"
              }
              description={
                query.isPending
                  ? "Getting photos, menu highlights, and offers."
                  : query.error?.message || "Please try again."
              }
              loading={query.isPending}
              retry={() => void query.refetch()}
            />
            <Link
              className={styles.textLink}
              href="/explore?service=restaurants"
            >
              Back to dining & cafes
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function RestaurantContent({
  restaurant: r,
  today,
}: {
  restaurant: RestaurantDetails;
  today: string;
}) {
  const router = useRouter();
  const auth = useCustomerAuth();
  const client = useQueryClient();
  const [modal, setModal] = useState<"photos" | "share" | "enquiry" | null>(
    null,
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [category, setCategory] = useState<string>("All items");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<DiningPlan>({
    date: today,
    time: "13:00",
    guests: 2,
    seating: "any",
    interests: [],
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const saved = useQuery({
    queryKey: ["customer", "profile-favorites", auth.user?.id],
    queryFn: getCustomerSavedItems,
    enabled: auth.user?.role === "customer" && !auth.loading,
  });
  const favorite = saved.data?.find(
    (item) => item.kind === "provider" && item.targetId === r.id,
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!saved.isSuccess)
        throw new Error("Saved restaurants could not be loaded. Try again.");
      if (favorite) await customerDel(`/favorites/${favorite.id}`);
      else
        await customerPost("/favorites", {
          targetType: "provider",
          targetId: r.id,
        });
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["customer", "profile-favorites"],
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const phone = restaurantPhone(r.phone);
  const website = publicWebsite(r.website);
  const maps = restaurantMapLinks(r);
  const messageHref = r.userId
    ? `/account/messages?with=${encodeURIComponent(r.userId)}`
    : "";
  const contactHref = auth.user
    ? messageHref
    : `/account?auth=signin&next=${encodeURIComponent(messageHref)}`;
  const update = (patch: Partial<DiningPlan>) =>
    setPlan((current) => ({ ...current, ...patch }));
  const toggleInterest = (item: string) =>
    setPlan((current) => ({
      ...current,
      interests: current.interests.includes(item)
        ? current.interests.filter((value) => value !== item)
        : [...current.interests, item],
    }));
  const categories = DINING_CATEGORIES.filter(
    (item) =>
      item === "All items" ||
      r.menu.some((dish) => diningCategory(dish) === item),
  );
  const menu = r.menu.filter(
    (item) =>
      (category === "All items" || diningCategory(item) === category) &&
      item.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const error = diningPlanError(plan, today);
  const enquiry = diningEnquiry(r, plan);
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Select and copy the text below.");
    }
  };
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!error) setModal("enquiry");
  }
  return (
    <>
      <div className={styles.topRow}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={13} />
          <Link href="/explore">Explore</Link>
          <ChevronRight size={13} />
          <Link href="/explore?service=restaurants">Dining & cafes</Link>
          <ChevronRight size={13} />
          <span aria-current="page">{r.name}</span>
        </nav>
        <div className={styles.actions}>
          <button
            type="button"
            aria-pressed={!!favorite}
            disabled={
              auth.loading || save.isPending || (!!auth.user && saved.isPending)
            }
            onClick={() =>
              auth.user
                ? save.mutate()
                : router.push(
                    `/account?auth=signin&next=${encodeURIComponent(`/restaurants/${r.id}`)}`,
                  )
            }
          >
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
            {save.isPending
              ? "Saving…"
              : favorite
                ? "Saved"
                : "Save to wishlist"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShareUrl(window.location.href);
              setModal("share");
            }}
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
      <header className={styles.heading}>
        <div>
          <div className={styles.badges}>
            {r.verified && (
              <span>
                <BadgeCheck size={14} />
                Verified restaurant
              </span>
            )}
            {r.cuisine.map((cuisine) => (
              <span key={cuisine}>{cuisine}</span>
            ))}
          </div>
          <h1>{r.name}</h1>
          {(r.address || r.city) && (
            <a
              className={styles.address}
              href={maps.external}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin size={16} />
              {r.address || r.city}
              {r.address &&
              r.city &&
              !r.address.toLowerCase().includes(r.city.toLowerCase())
                ? ` · ${r.city}`
                : ""}
            </a>
          )}
        </div>
        <a className={styles.rating} href="#restaurant-rating">
          <Star size={23} fill="currentColor" />
          <span>
            <strong>
              {r.reviewCount ? `${r.rating.toFixed(2)} / 5` : "New on BANJARA"}
            </strong>
            <small>
              {r.reviewCount
                ? `${r.reviewCount} provider ratings`
                : "Be among the first to visit"}
            </small>
          </span>
        </a>
      </header>
      <RestaurantGallery
        photos={r.images}
        name={r.name}
        onOpen={(index) => {
          setPhotoIndex(index);
          setModal("photos");
        }}
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.facts}>
            <Fact
              icon={Croissant}
              title="Cuisine & local flavours"
              value={
                r.cuisine.join(" · ") ||
                "Ask the restaurant about its specialties."
              }
            />
            <Fact
              icon={UtensilsCrossed}
              title="On the menu"
              value={
                r.menu.length
                  ? `${r.menu.length} menu highlights to explore`
                  : "Ask for today’s menu"
              }
            />
            <Fact
              icon={Clock3}
              title="Operating hours"
              value={r.hours || "Contact the restaurant for opening hours."}
            />
            <Fact
              icon={MapPin}
              title="Find us"
              value={
                r.city || r.address || "Contact the restaurant for directions."
              }
            />
          </div>
          <section className={styles.panel} aria-labelledby="restaurant-about">
            <p className={styles.eyebrow}>
              <Coffee size={15} />
              THE LOCAL TABLE
            </p>
            <h2 id="restaurant-about">A taste of {r.city || "the north"}</h2>
            <p className={styles.description}>
              {r.description ||
                "Discover the restaurant’s menu highlights below, then get in touch to plan your visit."}
            </p>
            <div className={styles.inlineLinks}>
              <a href="#restaurant-menu">
                <UtensilsCrossed size={16} />
                Explore the menu
                <ArrowRight size={15} />
              </a>
              {phone && (
                <a href={`tel:${phone}`}>
                  <Phone size={16} />
                  Call restaurant
                </a>
              )}
            </div>
          </section>
          <section
            id="restaurant-menu"
            className={styles.menuSection}
            aria-labelledby="restaurant-menu-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>
                  <UtensilsCrossed size={15} />
                  MENU & LOCAL FAVOURITES
                </p>
                <h2 id="restaurant-menu-title">Find your next favourite</h2>
              </div>
              <span className={styles.muted}>{r.menu.length} highlights</span>
            </div>
            <p className={styles.muted}>
              Add menu interests to your enquiry. The restaurant confirms
              availability, portions, and prices.
            </p>
            {r.menu.length > 0 && (
              <>
                <div className={styles.menuTools}>
                  <div
                    className={styles.filters}
                    role="group"
                    aria-label="Menu categories"
                  >
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={category === item}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <label className={styles.search}>
                    <Search size={16} />
                    <input
                      aria-label="Search menu highlights"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Find a favourite…"
                    />
                  </label>
                </div>
                <p className={styles.resultCount} aria-live="polite">
                  {menu.length} {menu.length === 1 ? "highlight" : "highlights"}
                  {category !== "All items" ? ` · ${category}` : ""}
                </p>
              </>
            )}
            {menu.length ? (
              <div className={styles.menuGrid}>
                {menu.map((item) => {
                  const group = diningCategory(item),
                    Icon =
                      group === "Drinks"
                        ? Coffee
                        : group === "Bakery & sweets"
                          ? Croissant
                          : UtensilsCrossed;
                  const selected = plan.interests.includes(item);
                  return (
                    <article
                      key={item}
                      className={styles.menuCard}
                      data-selected={selected}
                    >
                      <div className={styles.dishArtwork}>
                        <Icon size={36} strokeWidth={1.2} />
                        <span>{group}</span>
                      </div>
                      <div className={styles.dishBody}>
                        <p className={styles.eyebrow}>
                          FROM THE RESTAURANT’S MENU
                        </p>
                        <h3>{item}</h3>
                        <div className={styles.dishFooter}>
                          <span>Enquire for price</span>
                          <button
                            type="button"
                            aria-label={`${selected ? "Remove" : "Add"} ${item} ${selected ? "from" : "to"} enquiry`}
                            aria-pressed={selected}
                            onClick={() => toggleInterest(item)}
                          >
                            {selected ? (
                              <Check size={16} />
                            ) : (
                              <Plus size={16} />
                            )}
                            {selected ? "Added" : "Enquire"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <HomeState
                title={
                  r.menu.length
                    ? "No matching highlights"
                    : "Today’s menu is with the kitchen"
                }
                description={
                  r.menu.length
                    ? "Try another name or category."
                    : "Contact the restaurant for its latest dishes and prices."
                }
                {...(r.menu.length
                  ? {
                      retry: () => {
                        setSearch("");
                        setCategory("All items");
                      },
                      retryLabel: "Show all items",
                    }
                  : {})}
              />
            )}
          </section>
          {r.offers.length > 0 && (
            <section
              className={styles.panel}
              aria-labelledby="restaurant-offers"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    <Tag size={15} />
                    FROM THE RESTAURANT
                  </p>
                  <h2 id="restaurant-offers">Offers worth a look</h2>
                </div>
              </div>
              <div className={styles.offers}>
                {r.offers.map((offer) => (
                  <article key={offer.id}>
                    <span className={styles.offerIcon}>
                      <Tag size={21} />
                    </span>
                    <div>
                      <h3>{offer.title}</h3>
                      {offer.description && <p>{offer.description}</p>}
                    </div>
                    {offer.discountPercent && (
                      <strong>
                        {offer.discountPercent}%<small>off</small>
                      </strong>
                    )}
                  </article>
                ))}
              </div>
              <p className={styles.footnote}>
                Confirm terms and availability with the restaurant before your
                visit.
              </p>
            </section>
          )}
          <section
            className={`${styles.panel} ${styles.host}`}
            aria-labelledby="restaurant-host"
          >
            <span className={styles.hostIcon}>
              <Coffee size={30} />
            </span>
            <div>
              <p className={styles.eyebrow}>MEET YOUR LOCAL HOST</p>
              <h2 id="restaurant-host">{r.name}</h2>
              <p>
                Ask about dietary needs, group visits, seating, or the day’s
                specials.
              </p>
              <div className={styles.inlineLinks}>
                {messageHref && (
                  <Link href={contactHref}>
                    <MessageSquare size={16} />
                    Message restaurant
                  </Link>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer">
                    <Globe size={16} />
                    Visit website
                    <ArrowRight size={14} />
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`}>
                    <Phone size={16} />
                    {r.phone}
                  </a>
                )}
              </div>
            </div>
          </section>
          <section
            id="restaurant-rating"
            className={styles.panel}
            aria-labelledby="restaurant-rating-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>
                  <Star size={15} />
                  THE BANJARA COMMUNITY
                </p>
                <h2 id="restaurant-rating-title">Provider rating</h2>
              </div>
              <span className={styles.reviewScore}>
                <Star size={25} fill="currentColor" />
                <strong>{r.reviewCount ? r.rating.toFixed(2) : "—"}</strong>
              </span>
            </div>
            <p className={styles.muted}>
              {r.reviewCount
                ? `${r.reviewCount} ratings across this provider’s services.`
                : "This provider hasn’t received any ratings yet."}
            </p>
          </section>
          <section
            className={styles.panel}
            aria-labelledby="restaurant-directions"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>
                  <Navigation size={15} />
                  PLAN YOUR WAY HERE
                </p>
                <h2 id="restaurant-directions">How to reach us</h2>
              </div>
              <a
                className={styles.textLink}
                href={maps.external}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={16} />
                Google Maps
                <ArrowRight size={15} />
              </a>
            </div>
            <p className={styles.muted}>
              {r.address ||
                r.city ||
                "Contact the restaurant for its exact location."}
            </p>
            {maps.embed ? (
              <iframe
                className={styles.map}
                title={`Map of ${r.name}`}
                src={maps.embed}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <a
                className={styles.mapPlaceholder}
                href={maps.external}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={32} />
                <span>Find {r.name} on Google Maps</span>
              </a>
            )}
          </section>
        </div>
        <aside className={styles.aside} aria-label="Plan a restaurant visit">
          <form className={styles.planner} onSubmit={prepare} noValidate>
            <div className={styles.plannerHeading}>
              <span className={styles.plannerIcon}>
                <UtensilsCrossed size={23} />
              </span>
              <div>
                <p className={styles.eyebrow}>YOUR TABLE, YOUR WAY</p>
                <h2>Plan your visit</h2>
              </div>
            </div>
            <p className={styles.muted}>
              A good meal starts with a little planning.
            </p>
            <fieldset>
              <legend>
                <CalendarDays size={16} />
                Select day
              </legend>
              <div className={styles.dayButtons}>
                {[
                  { label: "Today", date: today },
                  { label: "Tomorrow", date: nextStayDate(today) },
                ].map((day) => (
                  <button
                    type="button"
                    key={day.label}
                    aria-pressed={plan.date === day.date}
                    onClick={() => update({ date: day.date })}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <label className={styles.field}>
                Visit date
                <input
                  type="date"
                  aria-label="Visit date"
                  value={plan.date}
                  min={today}
                  onInput={(e) => update({ date: e.currentTarget.value })}
                  onChange={(e) => update({ date: e.target.value })}
                />
              </label>
            </fieldset>
            <fieldset>
              <legend>
                <Clock3 size={16} />
                Preferred time
              </legend>
              <div className={styles.timeButtons}>
                {[
                  { time: "08:30", label: "Breakfast" },
                  { time: "13:00", label: "Lunch" },
                  { time: "17:30", label: "Sunset tea" },
                  { time: "19:30", label: "Dinner" },
                ].map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    aria-pressed={plan.time === slot.time}
                    onClick={() => update({ time: slot.time })}
                  >
                    <strong>{slot.time}</strong>
                    <small>{slot.label}</small>
                  </button>
                ))}
              </div>
              <label className={styles.field}>
                Your preferred time
                <input
                  type="time"
                  aria-label="Preferred visit time"
                  value={plan.time}
                  onInput={(e) => update({ time: e.currentTarget.value })}
                  onChange={(e) => update({ time: e.target.value })}
                />
              </label>
              <small className={styles.footnote}>
                Pakistan time · subject to the restaurant’s opening hours.
              </small>
            </fieldset>
            <fieldset>
              <legend>
                <Users size={16} />
                Guests & party size
              </legend>
              <div className={styles.party}>
                <span>Number of guests</span>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    aria-label="Fewer guests"
                    disabled={plan.guests <= 1}
                    onClick={() => update({ guests: plan.guests - 1 })}
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label="Guest count" aria-live="polite">
                    {plan.guests}
                  </output>
                  <button
                    type="button"
                    aria-label="More guests"
                    disabled={plan.guests >= 20}
                    onClick={() => update({ guests: plan.guests + 1 })}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </fieldset>
            <fieldset className={styles.seating}>
              <legend>Seating preference</legend>
              {[
                {
                  value: "any",
                  label: "No preference",
                  detail: "Let the team find a spot for you",
                },
                {
                  value: "outdoor",
                  label: "Outdoor, if available",
                  detail: "A little fresh air with your meal",
                },
                {
                  value: "indoor",
                  label: "Indoor, if available",
                  detail: "A comfortable spot inside",
                },
              ].map((seat) => (
                <label key={seat.value}>
                  <input
                    type="radio"
                    name="seating"
                    value={seat.value}
                    checked={plan.seating === seat.value}
                    onChange={() =>
                      update({ seating: seat.value as DiningPlan["seating"] })
                    }
                  />
                  <span>
                    <strong>{seat.label}</strong>
                    <small>{seat.detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {plan.interests.length > 0 && (
              <div className={styles.interests}>
                <p className={styles.eyebrow}>YOUR MENU INTERESTS</p>
                {plan.interests.map((item) => (
                  <div key={item}>
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => toggleInterest(item)}
                      aria-label={`Remove ${item} from selection`}
                    >
                      <Minus size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={styles.field}>
              Anything else?
              <textarea
                aria-label="Visit notes"
                maxLength={500}
                rows={3}
                value={plan.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Dietary needs, a special occasion…"
              />
            </label>
            <div className={styles.notice}>
              <Info size={17} />
              <p>
                Your enquiry is a request. The restaurant will confirm seating,
                menu prices, and any reservation arrangements.
              </p>
            </div>
            {submitted && error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button className={styles.primary} type="submit">
              Prepare visit enquiry
              <ArrowRight size={17} />
            </button>
            {phone && (
              <a className={styles.callButton} href={`tel:${phone}`}>
                <Phone size={17} />
                Call restaurant
              </a>
            )}
          </form>
          <div className={styles.visitNote}>
            <MapPin size={19} />
            <div>
              <strong>Make it part of your journey</strong>
              <p>
                Check directions and opening hours before heading out. Ask the
                team about access and group seating.
              </p>
            </div>
          </div>
        </aside>
      </div>
      {modal === "photos" && (
        <HomeDialog
          title={`${r.name} · gallery`}
          onClose={() => setModal(null)}
        >
          <div className={styles.lightbox}>
            <RestaurantImage
              key={r.images[photoIndex]}
              src={r.images[photoIndex]}
              alt={`${r.name} · photo ${photoIndex + 1}`}
              eager
            />
            <div>
              <button
                type="button"
                aria-label="Previous photo"
                disabled={r.images.length < 2}
                onClick={() =>
                  setPhotoIndex(
                    (photoIndex - 1 + r.images.length) % r.images.length,
                  )
                }
              >
                <ChevronLeft size={20} />
              </button>
              <span aria-live="polite">
                {photoIndex + 1} / {r.images.length}
              </span>
              <button
                type="button"
                aria-label="Next photo"
                disabled={r.images.length < 2}
                onClick={() =>
                  setPhotoIndex((photoIndex + 1) % r.images.length)
                }
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </HomeDialog>
      )}
      {modal === "share" && (
        <HomeDialog
          title="Share this restaurant"
          onClose={() => setModal(null)}
        >
          <div className={styles.modalContent}>
            <p>Plan a stop at {r.name} with your travel companions.</p>
            <label className={styles.field}>
              Restaurant link
              <input
                aria-label="Restaurant link"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              className={styles.primary}
              type="button"
              onClick={() => void copy(shareUrl, "Restaurant link copied")}
            >
              <Copy size={16} />
              Copy link
            </button>
          </div>
        </HomeDialog>
      )}
      {modal === "enquiry" && (
        <HomeDialog title="Your visit enquiry" onClose={() => setModal(null)}>
          <div className={styles.modalContent}>
            <p>
              Copy your plan and share it with {r.name}. Your visit is confirmed
              when the restaurant agrees to the arrangements.
            </p>
            <label className={styles.field}>
              Enquiry summary
              <textarea
                aria-label="Enquiry summary"
                rows={13}
                value={enquiry}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              className={styles.primary}
              type="button"
              onClick={() => void copy(enquiry, "Visit enquiry copied")}
            >
              <Copy size={16} />
              Copy enquiry
            </button>
            <div className={styles.inlineLinks}>
              {messageHref && (
                <Link href={contactHref}>
                  <MessageSquare size={16} />
                  Open messages
                  <ArrowRight size={15} />
                </Link>
              )}
              {phone && (
                <a href={`tel:${phone}`}>
                  <Phone size={16} />
                  Call restaurant
                </a>
              )}
            </div>
            <small className={styles.footnote}>
              Opening messages won’t send the enquiry automatically. Paste your
              copied plan into the conversation.
            </small>
          </div>
        </HomeDialog>
      )}
    </>
  );
}

function Fact({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Clock3;
  title: string;
  value: string;
}) {
  return (
    <div className={styles.fact}>
      <span>
        <Icon size={23} strokeWidth={1.5} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
}
