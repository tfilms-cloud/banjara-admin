"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Flag,
  Headphones,
  Heart,
  Info,
  Mail,
  MessageSquare,
  Minus,
  Mountain,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Share2,
  ShieldCheck,
  Star,
  Sun,
  Tent,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import {
  HomeDialog,
  HomeImage,
  HomeState,
} from "@/components/site/home/home-primitives";
import { HotelGallery } from "@/components/site/hotels/hotel-primitives";
import { customerDel, customerPost } from "@/lib/customer-api";
import {
  tourBaseFare,
  tourBookingHref,
  tourEndDate,
  tourPhotos,
  tourPlanQuery,
  tourTravelerLimit,
  validateTourPlan,
} from "@/lib/tour-details";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCustomerSavedItems } from "@/services/customer/profile.service";
import {
  getOperatorTours,
  getPublishedTour,
  getTourOperator,
} from "@/services/customer/tour.service";
import type {
  TourItinerary,
  TourOperator,
  TourPlan,
} from "@/types/customer/tour";
import base from "@/components/site/hotels/hotel-details.module.css";
import styles from "./tour-details.module.css";

type Props = {
  id: string;
  initialTour?: TourItinerary;
  initialOperator?: TourOperator;
  initialPlan: TourPlan;
  today: string;
};
type Modal = "photos" | "share" | "operator" | null;

export function WebsiteTourDetails(props: Props) {
  const query = useQuery({
    queryKey: ["customer", "tour-details", props.id],
    queryFn: () => getPublishedTour(props.id),
    initialData: props.initialTour,
    staleTime: 15000,
    refetchInterval: 60000,
  });
  if (!query.data)
    return (
      <div className={`${base.page} ${styles.page}`}>
        <div className={styles.container}>
          <HomeState
            loading={query.isPending}
            title={
              query.isPending
                ? "Loading expedition…"
                : "Tour details unavailable"
            }
            description={
              query.isPending
                ? "Getting the operator’s published itinerary."
                : query.error?.message ||
                  "This package may no longer be available."
            }
            retry={() => void query.refetch()}
          />
          <Link className={styles.back} href="/explore?service=tours">
            Back to tours
          </Link>
        </div>
      </div>
    );
  return (
    <TourDetailsContent
      key={query.data.id}
      tour={query.data}
      initialOperator={props.initialOperator}
      initialPlan={props.initialPlan}
      today={props.today}
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    />
  );
}

function TourDetailsContent({
  tour,
  initialOperator,
  initialPlan,
  today,
  refresh,
  refreshing,
}: {
  tour: TourItinerary;
  initialOperator?: TourOperator;
  initialPlan: TourPlan;
  today: string;
  refresh: () => void;
  refreshing: boolean;
}) {
  const router = useRouter();
  const auth = useCustomerAuth();
  const client = useQueryClient();
  const [plan, setPlan] = useState(initialPlan);
  const [modal, setModal] = useState<Modal>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [openDays, setOpenDays] = useState<number[]>([0]);
  const operatorQuery = useQuery({
    queryKey: ["customer", "tour-operator", tour.providerId],
    queryFn: () => getTourOperator(tour.providerId),
    enabled: !!tour.providerId,
    initialData: initialOperator,
    staleTime: 60000,
  });
  const operatorTours = useQuery({
    queryKey: ["customer", "operator-tours", tour.providerId],
    queryFn: () => getOperatorTours(tour.providerId),
    enabled: modal === "operator" && !!tour.providerId,
    staleTime: 60000,
  });
  const saved = useQuery({
    queryKey: ["customer", "profile-favorites", auth.user?.id],
    queryFn: getCustomerSavedItems,
    enabled: auth.user?.role === "customer" && !auth.loading,
  });
  const favorite = saved.data?.find(
    (item) => item.kind === "provider" && item.targetId === tour.providerId,
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!saved.isSuccess)
        throw new Error("Saved operators could not be loaded. Try again.");
      if (favorite) await customerDel(`/favorites/${favorite.id}`);
      else
        await customerPost("/favorites", {
          targetType: "provider",
          targetId: tour.providerId,
        });
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["customer", "profile-favorites"],
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const operator = operatorQuery.data;
  const photos = tourPhotos(tour);
  const total = tourBaseFare(tour, plan.travelers);
  const money = (value: number) => formatCurrency(value, tour.currency);
  const endDate = tourEndDate(tour, plan.startDate);
  const planError = validateTourPlan(tour, plan, today);
  const max = tourTravelerLimit(tour);
  const phone = operator?.phone.replace(/[^\d+]/g, "");
  const messageHref = operator?.userId
    ? `/account/messages?with=${encodeURIComponent(operator.userId)}`
    : "";
  const allExpanded =
    tour.days.length > 0 && openDays.length === tour.days.length;
  const updatePlan = (patch: Partial<TourPlan>) => {
    const next = { ...plan, ...patch };
    setPlan(next);
    if (!validateTourPlan(tour, next, today))
      window.history.replaceState(
        null,
        "",
        `/tours/${tour.id}?${tourPlanQuery(next)}`,
      );
  };
  const toggleDay = (index: number) =>
    setOpenDays((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index],
    );
  return (
    <div className={`${base.page} ${styles.page}`}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/explore">Explore</Link>
            <span>›</span>
            <Link href={`/explore?service=tours&tourType=${tour.tourType}`}>
              Tours & Expeditions
            </Link>
            <span>›</span>
            <span aria-current="page">{tour.title}</span>
          </nav>
          <div className={styles.actions}>
            {operator?.verified && (
              <span className={styles.verified}>
                <BadgeCheck size={13} />
                Verified operator
              </span>
            )}
            {tour.difficulty && (
              <span className={styles.badge}>
                <Mountain size={13} />
                {tour.difficulty} difficulty
              </span>
            )}
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
            <button
              type="button"
              className={styles.iconButton}
              aria-label={favorite ? "Unsave operator" : "Save operator"}
              aria-pressed={!!favorite}
              disabled={
                auth.loading ||
                save.isPending ||
                (!!auth.user && !saved.isSuccess)
              }
              onClick={() =>
                auth.user
                  ? save.mutate()
                  : router.push(
                      `/account?auth=signin&next=${encodeURIComponent(`/tours/${tour.id}?${tourPlanQuery(plan)}`)}`,
                    )
              }
            >
              <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        <section className={styles.heading}>
          <div className={styles.place}>
            <strong>{tour.destination}</strong>
            {tour.region && (
              <>
                <span>•</span>
                <span>{tour.region}</span>
              </>
            )}
            {tour.departureLocation && (
              <>
                <span>•</span>
                <span>Departs from {tour.departureLocation}</span>
              </>
            )}
          </div>
          <h1>{tour.title}</h1>
          <div className={styles.titleMeta}>
            <div className={styles.tags}>
              <span>
                <Mountain size={14} />
                {tour.tourType}
              </span>
              <span>
                <CalendarDays size={14} />
                {tour.durationDays} days
                {tour.durationNights !== undefined
                  ? ` · ${tour.durationNights} nights`
                  : ""}
              </span>
              {tour.bestSeason && (
                <span>
                  <Sun size={14} />
                  {tour.bestSeason}
                </span>
              )}
            </div>
            {operator && operator.reviewCount > 0 ? (
              <button
                type="button"
                className={styles.rating}
                onClick={() => setModal("operator")}
              >
                <Star size={15} fill="currentColor" />
                <strong>{operator.rating.toFixed(1)}</strong>
                <span>({operator.reviewCount} operator reviews)</span>
              </button>
            ) : (
              <span className={styles.muted}>Published tour package</span>
            )}
          </div>
        </section>
        <div className={styles.gallery}>
          <HotelGallery
            subject="tour"
            photos={photos}
            name={tour.title}
            onOpen={(index) => {
              setPhotoIndex(index);
              setModal("photos");
            }}
          />
        </div>
        <div className={styles.contentGrid}>
          <div className={styles.details}>
            <div className={styles.facts}>
              {[
                {
                  icon: CalendarDays,
                  label: "DURATION",
                  value: `${tour.durationDays} Days`,
                  detail:
                    tour.durationNights !== undefined
                      ? `${tour.durationNights} nights`
                      : "See the itinerary",
                },
                {
                  icon: Mountain,
                  label: "DIFFICULTY",
                  value: tour.difficulty || "Ask operator",
                  detail: `${tour.tourType} package`,
                },
                {
                  icon: Users,
                  label: "GROUP SIZE",
                  value: max
                    ? `Max ${tour.maxParticipants} travelers`
                    : "Ask operator",
                  detail: "Package participant limit",
                },
                {
                  icon: Sun,
                  label: "BEST SEASON",
                  value: tour.bestSeason || "Ask operator",
                  detail: tour.destination,
                },
              ].map(({ icon: Icon, label, value, detail }) => (
                <article key={label}>
                  <span>
                    <Icon size={17} />
                  </span>
                  <small>{label}</small>
                  <h3>{value}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
            <section className={styles.about}>
              <h2>About This Expedition</h2>
              {tour.summary && <p>{tour.summary}</p>}
              {tour.description ? (
                tour.description
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p className={styles.muted}>
                  Ask the operator for the full expedition description.
                </p>
              )}
              {tour.included.length > 0 && (
                <div className={styles.highlights}>
                  {tour.included.slice(0, 3).map((item) => (
                    <article key={item}>
                      <ShieldCheck size={18} />
                      <div>
                        <h3>{item}</h3>
                        <p>Included in this package</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            {tour.days.length > 0 && (
              <section className={styles.routeOverview}>
                <div className={styles.sectionHeading}>
                  <div>
                    <small>PUBLISHED ITINERARY</small>
                    <h2>
                      <Route size={18} />
                      Expedition Route Overview
                    </h2>
                  </div>
                  <a href="#tour-itinerary">
                    View day by day <ArrowRight size={14} />
                  </a>
                </div>
                <ol>
                  {tour.days.map((day, index) => (
                    <li key={`${day.dayNumber}-${index}`}>
                      <span>{String(day.dayNumber).padStart(2, "0")}</span>
                      <strong>{day.title}</strong>
                      <small>Day {day.dayNumber}</small>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className={styles.itinerary} id="tour-itinerary">
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Detailed Expedition Itinerary</h2>
                  <p>
                    {tour.durationDays}-day journey
                    {tour.region
                      ? ` across ${tour.region}`
                      : ` to ${tour.destination}`}
                  </p>
                </div>
                {tour.days.length > 0 && (
                  <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() =>
                      setOpenDays(
                        allExpanded ? [] : tour.days.map((_, index) => index),
                      )
                    }
                  >
                    {allExpanded ? "Collapse all" : "Expand all"}
                  </button>
                )}
              </div>
              {tour.days.length ? (
                <div className={styles.days}>
                  {tour.days.map((day, index) => (
                    <article
                      className={styles.day}
                      data-open={openDays.includes(index)}
                      key={`${day.dayNumber}-${index}`}
                    >
                      <h3>
                        <button
                          type="button"
                          aria-expanded={openDays.includes(index)}
                          aria-controls={`tour-day-${index}`}
                          onClick={() => toggleDay(index)}
                        >
                          <span className={styles.dayNumber}>
                            {String(day.dayNumber).padStart(2, "0")}
                          </span>
                          <span>
                            {day.title}
                            <small>
                              Day {day.dayNumber} · {tour.destination}
                            </small>
                          </span>
                          <ChevronDown size={19} />
                        </button>
                      </h3>
                      <div
                        id={`tour-day-${index}`}
                        className={styles.dayBody}
                        hidden={!openDays.includes(index)}
                      >
                        {day.description ||
                          "Contact the operator for the detailed plan for this day."}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <HomeState
                  title="Day-by-day itinerary coming soon"
                  description="Ask the operator for the complete daily schedule before booking."
                />
              )}
            </section>
            <section className={styles.coverage}>
              <h2>What’s Covered in This Package</h2>
              <div className={styles.coverageGrid}>
                <article className={styles.included}>
                  <h3>
                    <CheckCircle2 size={22} />
                    Included Services
                  </h3>
                  {tour.included.length ? (
                    <ul>
                      {tour.included.map((item) => (
                        <li key={item}>
                          <CheckCircle2 size={16} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>
                      Confirm included services with the operator.
                    </p>
                  )}
                </article>
                <article className={styles.excluded}>
                  <h3>
                    <XCircle size={22} />
                    Not Included
                  </h3>
                  {tour.excluded.length ? (
                    <ul>
                      {tour.excluded.map((item) => (
                        <li key={item}>
                          <XCircle size={16} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>
                      Ask the operator about additional costs and exclusions.
                    </p>
                  )}
                </article>
              </div>
            </section>
            <section className={styles.operator} id="tour-operator">
              <div className={styles.operatorLogo}>
                {operator?.logo ? (
                  <HomeImage
                    src={operator.logo}
                    alt={`${operator.name} logo`}
                  />
                ) : (
                  <Tent size={30} />
                )}
              </div>
              <div className={styles.operatorCopy}>
                <h2>
                  {operator?.name || "Your tour operator"}
                  {operator?.verified && (
                    <BadgeCheck size={17} aria-label="Verified operator" />
                  )}
                </h2>
                <p>
                  {operator?.city || tour.region || tour.destination}
                  {operator?.yearsExperience
                    ? ` · ${operator.yearsExperience} years of experience`
                    : ""}
                </p>
                {operator?.reviewCount ? (
                  <span>
                    <Star size={14} fill="currentColor" />
                    {operator.rating.toFixed(1)} · {operator.reviewCount}{" "}
                    operator reviews
                  </span>
                ) : (
                  <span>Published by the package operator</span>
                )}
              </div>
              <div className={styles.operatorActions}>
                {messageHref && (
                  <Link href={messageHref} className={styles.secondary}>
                    <MessageSquare size={15} />
                    Direct Message
                  </Link>
                )}
                <button
                  type="button"
                  className={styles.outline}
                  onClick={() => setModal("operator")}
                >
                  View operator profile
                </button>
              </div>
            </section>
            <section className={styles.preparation}>
              <h2>
                <Flag size={20} />
                Preparation & Travel Requirements
              </h2>
              <div>
                {[
                  {
                    title: "1. Discuss the route",
                    text: "Confirm the itinerary, current conditions and your experience level with the operator.",
                  },
                  {
                    title: "2. Plan your essentials",
                    text: "Request the packing list, accommodation details and pickup arrangements before departure.",
                  },
                  {
                    title: "3. Confirm requirements",
                    text: "Ask which permits, documents, insurance and cancellation terms apply to your chosen package.",
                  },
                ].map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <aside className={styles.sidebar} aria-label="Plan your expedition">
            <section className={styles.reservation} id="tour-reservation">
              <div className={styles.priceHeading}>
                <div>
                  <small>STARTING FROM</small>
                  <p>
                    <strong>
                      {Number.isFinite(tour.pricePerPerson)
                        ? money(tour.pricePerPerson)
                        : "Ask operator"}
                    </strong>
                    <span>/ person</span>
                  </p>
                </div>
                <span className={styles.verified}>Published package rate</span>
              </div>
              <label className={styles.dateField}>
                Requested start date
                <input
                  type="date"
                  name="startDate"
                  required
                  min={today}
                  value={plan.startDate}
                  onInput={(event) =>
                    updatePlan({ startDate: event.currentTarget.value })
                  }
                  onChange={(event) =>
                    updatePlan({ startDate: event.target.value })
                  }
                />
              </label>
              {endDate && (
                <p className={styles.returnDate}>
                  Expected end date: {formatDate(endDate)}
                </p>
              )}
              <div className={styles.travelerLabel}>
                Travelers / Explorers{" "}
                <small>Up to {tour.maxParticipants} per booking</small>
              </div>
              <div className={styles.quantity}>
                <span>Traveler count</span>
                <button
                  type="button"
                  aria-label="Remove one traveler"
                  disabled={plan.travelers <= 1}
                  onClick={() => updatePlan({ travelers: plan.travelers - 1 })}
                >
                  <Minus size={15} />
                </button>
                <output aria-label="Travelers">{plan.travelers}</output>
                <button
                  type="button"
                  aria-label="Add one traveler"
                  disabled={plan.travelers >= max}
                  onClick={() => updatePlan({ travelers: plan.travelers + 1 })}
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className={styles.breakdown}>
                <div>
                  <span>
                    Package fare ({plan.travelers} ×{" "}
                    {money(tour.pricePerPerson)})
                  </span>
                  <strong>{money(total)}</strong>
                </div>
                <div>
                  <span>Taxes & service fees</span>
                  <span>Calculated at booking</span>
                </div>
                <div className={styles.total}>
                  <strong>Base fare subtotal</strong>
                  <strong>{money(total)}</strong>
                </div>
              </div>
              {planError && (
                <p role="alert" className={styles.error}>
                  {planError}
                </p>
              )}
              {!planError ? (
                <Link
                  className={styles.primary}
                  href={tourBookingHref(tour, plan)}
                >
                  Reserve Expedition Spot <ArrowRight size={18} />
                </Link>
              ) : (
                <button type="button" className={styles.primary} disabled>
                  Reserve Expedition Spot <ArrowRight size={18} />
                </button>
              )}
              <button
                type="button"
                className={styles.secondary}
                onClick={() => window.print()}
              >
                <FileText size={16} />
                Print detailed itinerary
              </button>
              <div className={styles.reassurance}>
                <p>
                  <ShieldCheck size={17} />
                  Review the operator’s package before reserving.
                </p>
                <p>
                  <CalendarDays size={17} />
                  Confirm your requested departure with the operator.
                </p>
                <p>
                  <Info size={17} />
                  Review taxes, payment and cancellation arrangements before
                  paying.
                </p>
              </div>
              <button
                type="button"
                className={styles.refresh}
                onClick={refresh}
                disabled={refreshing}
              >
                <RefreshCw size={14} />
                {refreshing ? "Refreshing package…" : "Refresh package details"}
              </button>
            </section>
            <section className={styles.hotline}>
              <span>
                <Headphones size={23} />
              </span>
              <div>
                <small>EXPEDITION OPERATOR CONTACT</small>
                {phone ? (
                  <a href={`tel:${phone}`}>{operator?.phone}</a>
                ) : (
                  <button type="button" onClick={() => setModal("operator")}>
                    View contact options
                  </button>
                )}
                <p>{operator?.city || tour.destination}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <div className={styles.mobileBooking}>
        <div>
          <strong>{money(tour.pricePerPerson)}</strong>
          <small>/ person</small>
        </div>
        <a href="#tour-reservation">
          Plan expedition <ArrowRight size={16} />
        </a>
      </div>
      {modal && (
        <HomeDialog
          title={
            modal === "photos"
              ? `${tour.title} · Photos`
              : modal === "share"
                ? "Share this expedition"
                : "Tour operator profile"
          }
          onClose={() => setModal(null)}
        >
          {modal === "photos" ? (
            <div className={styles.photoDialog}>
              <HomeImage
                src={photos[photoIndex]}
                alt={`${tour.title} · photo ${photoIndex + 1}`}
              />
              <div className={styles.photoControls}>
                <button
                  type="button"
                  aria-label="Previous tour photo"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex(
                      (photoIndex - 1 + photos.length) % photos.length,
                    )
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  {photoIndex + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  aria-label="Next tour photo"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex((photoIndex + 1) % photos.length)
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className={styles.thumbnails}>
                {photos.map((photo, index) => (
                  <button
                    type="button"
                    key={photo}
                    aria-label={`Show tour photo ${index + 1}`}
                    aria-pressed={photoIndex === index}
                    onClick={() => setPhotoIndex(index)}
                  >
                    <HomeImage src={photo} alt="" />
                  </button>
                ))}
              </div>
            </div>
          ) : modal === "share" ? (
            <div className={styles.dialogContent}>
              <p>Share this tour with your travel companions.</p>
              <label>
                Expedition link
                <input
                  aria-label="Expedition link"
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
                    .then(() => toast.success("Expedition link copied"))
                    .catch(() =>
                      toast.error("Select and copy the expedition link."),
                    )
                }
              >
                <Copy size={16} />
                Copy link
              </button>
            </div>
          ) : operatorQuery.isPending ? (
            <HomeState
              loading
              title="Loading operator…"
              description="Getting the published business profile."
            />
          ) : !operator ? (
            <HomeState
              title="Operator profile unavailable"
              description={operatorQuery.error?.message || "Please try again."}
              retry={() => void operatorQuery.refetch()}
            />
          ) : (
            <div className={styles.dialogContent}>
              <h3>
                {operator.name}
                {operator.verified && <BadgeCheck size={17} />}
              </h3>
              <p>
                {operator.city}
                {operator.yearsExperience
                  ? ` · ${operator.yearsExperience} years of experience`
                  : ""}
              </p>
              {operator.description && <p>{operator.description}</p>}
              <div className={styles.dialogActions}>
                {messageHref && (
                  <Link href={messageHref} className={styles.primary}>
                    <MessageSquare size={15} />
                    Direct Message
                  </Link>
                )}
                {phone && (
                  <a className={styles.secondary} href={`tel:${phone}`}>
                    <Phone size={15} />
                    Call operator
                  </a>
                )}
                {operator.email && (
                  <a
                    className={styles.secondary}
                    href={`mailto:${operator.email}`}
                  >
                    <Mail size={15} />
                    Email operator
                  </a>
                )}
              </div>
              <h3>Published packages</h3>
              {operatorTours.isPending ? (
                <p>Loading packages…</p>
              ) : operatorTours.isError ? (
                <HomeState
                  title="Packages unavailable"
                  description="Try loading this operator’s packages again."
                  retry={() => void operatorTours.refetch()}
                />
              ) : (
                <div className={styles.operatorPackages}>
                  {operatorTours.data?.map((item) => (
                    <Link
                      href={`/tours/${item.id}`}
                      key={item.id}
                      onClick={() => setModal(null)}
                    >
                      <span>{item.title}</span>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </HomeDialog>
      )}
    </div>
  );
}
