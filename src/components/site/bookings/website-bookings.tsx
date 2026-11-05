"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import {
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  RadioTower,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import {
  BOOKING_CATEGORIES,
  BOOKING_TABS,
  bookingDate,
  bookingMoney,
  bookingStatusLabel,
  bookingTab,
  bookingTime,
  canCancelItinerary,
  canDownloadPass,
  filterBookingItineraries,
  hasPaymentDue,
  offlineItineraryHtml,
  paymentStatusLabel,
  readBookingFilters,
} from "@/lib/booking-itineraries";
import {
  cancelItinerary,
  getBookingItineraries,
  getItineraryPass,
  getItineraryPayment,
} from "@/services/customer/itinerary.service";
import type {
  BookingPass,
  ItineraryBooking,
} from "@/types/customer/itinerary-booking";
import { ItineraryBookingCard, type BookingAction } from "./booking-card";
import styles from "./bookings.module.css";

type Modal =
  { action: BookingAction; booking: ItineraryBooking } | { action: "contacts" };
function downloadDocument(name: string, html: string) {
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WebsiteBookings() {
  const auth = useCustomerAuth();
  const router = useRouter(),
    params = useSearchParams(),
    client = useQueryClient();
  const filters = readBookingFilters(new URLSearchParams(params.toString()));
  const [localModal, setLocalModal] = useState<Modal | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const query = useQuery({
    queryKey: ["customer", "itineraries", auth.user?.id ?? "guest"],
    queryFn: getBookingItineraries,
    enabled: !auth.loading && auth.isAuthenticated,
    staleTime: 20000,
    refetchInterval: 60000,
  });
  const bookings = auth.isAuthenticated ? (query.data ?? []) : [];
  const linkedBooking = bookings.find(booking => booking.id === params.get("booking"));
  const modal: Modal | null = localModal ?? (linkedBooking ? { action: "details", booking: linkedBooking } : null);
  function setModal(nextModal: Modal | null) {
    setLocalModal(nextModal);
    if (params.has("booking")) {
      const next = new URLSearchParams(params.toString());
      next.delete("booking");
      router.replace(`/account/bookings${next.size ? `?${next}` : ""}`, { scroll: false });
    }
  }
  const visible = filterBookingItineraries(bookings, filters);
  const categoryBase = filterBookingItineraries(bookings, {
    ...filters,
    category: "all",
  });
  const active = bookings.filter((b) => bookingTab(b.status) === "upcoming");
  const months = [
    ...new Set([
      ...bookings.map((b) => b.date.slice(0, 7)).filter(Boolean),
      ...(filters.month !== "all" ? [filters.month] : []),
    ]),
  ]
    .sort()
    .reverse();
  const selected =
    modal && "booking" in modal
      ? (bookings.find((b) => b.id === modal.booking.id) ?? modal.booking)
      : undefined;
  const passQuery = useQuery({
    queryKey: ["customer", "booking-pass", auth.user?.id, selected?.id],
    queryFn: () => getItineraryPass(selected!.id),
    enabled:
      auth.isAuthenticated &&
      modal?.action === "pass" &&
      !!selected &&
      canDownloadPass(selected),
    staleTime: 0,
    retry: false,
  });
  const paymentQuery = useQuery({
    queryKey: [
      "customer",
      "booking-payment",
      auth.user?.id,
      selected?.paymentId,
    ],
    queryFn: () => getItineraryPayment(selected!.paymentId),
    enabled:
      auth.isAuthenticated &&
      modal?.action === "payment" &&
      !!selected?.paymentId,
    staleTime: 0,
    retry: false,
  });
  const cancellation = useMutation({
    mutationFn: cancelItinerary,
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["customer", "itineraries", auth.user?.id],
      });
      setModal(null);
      toast.success("Booking cancelled");
    },
    onError: (error) => toast.error(error.message),
  });
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (
        !value ||
        value === "all" ||
        (key === "status" && value === "upcoming")
      )
        next.delete(key);
      else next.set(key, value);
    });
    router.replace(`/account/bookings${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update({
      q: String(new FormData(event.currentTarget).get("q") ?? "").trim(),
    });
  };
  const onAction = (booking: ItineraryBooking, action: BookingAction) =>
    setModal({ action, booking });
  const monthLabel = (month: string) =>
    new Date(`${month}-01T00:00:00+05:00`).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Karachi",
    });
  const exportDossier = () =>
    downloadDocument("banjara-itinerary.html", offlineItineraryHtml(visible));
  const exportPasses = async () => {
    const eligible = visible.filter(canDownloadPass);
    if (!eligible.length) return;
    setExporting(true);
    try {
      const results = await Promise.allSettled(
        eligible.map((b) => getItineraryPass(b.id)),
      );
      const passes: Record<string, BookingPass> = {},
        ready: ItineraryBooking[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          passes[eligible[index].id] = result.value;
          ready.push(eligible[index]);
        }
      });
      if (!ready.length)
        throw new Error("No passes could be downloaded. Please try again.");
      downloadDocument(
        "banjara-offline-passes.html",
        offlineItineraryHtml(ready, passes),
      );
      if (ready.length < eligible.length)
        toast.warning(
          `${ready.length} of ${eligible.length} passes downloaded. Retry to get the remaining passes.`,
        );
      else toast.success("Offline passes downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not download passes.",
      );
    } finally {
      setExporting(false);
    }
  };
  const paidTotals = new Map<string, number>();
  active
    .filter((b) => ["paid", "confirmed"].includes(b.paymentStatus))
    .forEach((b) =>
      paidTotals.set(b.currency, (paidTotals.get(b.currency) ?? 0) + b.total),
    );
  const contacts = [
    ...new Map(
      active
        .filter((b) => b.providerPhone || b.providerEmail)
        .map((b) => [b.providerId || b.providerName, b]),
    ).values(),
  ];
  const modalTitle =
    modal?.action === "contacts"
      ? "Your travel contacts"
      : modal?.action === "cancel"
        ? "Cancel this booking?"
        : modal?.action === "pass"
          ? "Booking pass & QR"
          : modal?.action === "payment"
            ? "Payment details"
            : modal?.action === "contact"
              ? "Contact your provider"
              : modal?.action === "location"
                ? "Meeting point & directions"
                : "Booking details";
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/account">My Account</Link>
          <span>›</span>
          <strong>Bookings & Itineraries</strong>
        </nav>
        <header className={styles.pageHeader}>
          <div>
            <div className={styles.titleRow}>
              <h1>Bookings & Itineraries</h1>
              {auth.isAuthenticated && !query.isPending && (
                <span>
                  {active.length} ACTIVE{" "}
                  {active.length === 1 ? "JOURNEY" : "JOURNEYS"}
                </span>
              )}
            </div>
            <p>
              Manage your departures, lodging vouchers, mountain expeditions,
              and private guide bookings in one place.
            </p>
          </div>
          <div className={styles.headerActions}>
            <label>
              <CalendarDays size={16} />
              <span className={styles.srOnly}>Travel month</span>
              <select
                aria-label="Travel month"
                value={filters.month}
                onChange={(e) => update({ month: e.target.value })}
                disabled={!auth.isAuthenticated}
              >
                <option value="all">All travel dates</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.primary}
              onClick={exportDossier}
              disabled={!visible.length}
            >
              <Download size={16} />
              Export Itinerary Dossier
            </button>
          </div>
        </header>
        <div className={styles.toolbar}>
          <nav aria-label="Booking status" className={styles.statusTabs}>
            {BOOKING_TABS.map((tab, index) => {
              const Icon = [Clock3, CheckCircle2, XCircle][index];
              return (
                <button
                  type="button"
                  key={tab.id}
                  aria-pressed={filters.status === tab.id}
                  onClick={() => update({ status: tab.id })}
                  disabled={!auth.isAuthenticated}
                >
                  <Icon size={16} />
                  {tab.label} (
                  {
                    bookings.filter((b) => bookingTab(b.status) === tab.id)
                      .length
                  }
                  )
                </button>
              );
            })}
          </nav>
          <form className={styles.search} onSubmit={search}>
            <button
              type="submit"
              aria-label="Search bookings"
              disabled={!auth.isAuthenticated}
            >
              <Search size={17} />
            </button>
            <input
              key={filters.query}
              name="q"
              defaultValue={filters.query}
              aria-label="Search booking code, route, or provider"
              placeholder="Search booking code, route, or provider…"
              maxLength={160}
              disabled={!auth.isAuthenticated}
            />
          </form>
        </div>
        <div className={styles.filtersRow}>
          <nav aria-label="Booking services" className={styles.categoryTabs}>
            {BOOKING_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={filters.category === category.id}
                onClick={() => update({ category: category.id })}
                disabled={!auth.isAuthenticated}
              >
                {category.label} (
                {category.id === "all"
                  ? categoryBase.length
                  : categoryBase.filter((b) => b.kind === category.id).length}
                )
              </button>
            ))}
          </nav>
          <div className={styles.counters}>
            <span>{visible.filter(hasPaymentDue).length} Payment Due</span>
            <span>
              {
                visible.filter((b) =>
                  ["pending", "payment_verification"].includes(b.status),
                ).length
              }{" "}
              Awaiting Approval
            </span>
            <span>
              {visible.filter((b) => b.status === "confirmed").length} Confirmed
            </span>
          </div>
        </div>
        {params.size > 0 && (
          <button
            type="button"
            className={styles.clear}
            onClick={() =>
              router.replace("/account/bookings", { scroll: false })
            }
          >
            Clear filters
          </button>
        )}
        <div className={styles.contentGrid}>
          <div className={styles.bookingList}>
            {auth.loading ? (
              <HomeState
                loading
                title="Loading your account…"
                description="Preparing your bookings."
              />
            ) : !auth.isAuthenticated ? (
              <section className={styles.guestState}>
                <ShieldCheck size={36} />
                <h2>Your journeys, together</h2>
                <p>
                  Sign in to view your bookings, tickets, lodging vouchers, and
                  private guide requests.
                </p>
                <Link
                  className={styles.primary}
                  href={`/account?auth=signin&next=${encodeURIComponent(`/account/bookings${params.size ? `?${params}` : ""}`)}`}
                >
                  Sign in to view bookings
                  <ArrowRight size={16} />
                </Link>
                <Link href="/explore">Explore the north</Link>
              </section>
            ) : query.isPending ? (
              <HomeState
                loading
                title="Finding your bookings…"
                description="Loading your journeys and provider details."
              />
            ) : query.isError ? (
              <HomeState
                title="Bookings could not be loaded"
                description={query.error.message}
                retry={() => {
                  void query.refetch();
                }}
              />
            ) : visible.length ? (
              visible.map((booking) => (
                <ItineraryBookingCard
                  key={booking.id}
                  booking={booking}
                  onAction={onAction}
                />
              ))
            ) : (
              <HomeState
                title={
                  bookings.length
                    ? "No bookings match these filters"
                    : "Your next journey starts here"
                }
                description={
                  bookings.length
                    ? "Try another service, travel month, or search."
                    : "Your transport, hotel, tour and guide bookings will appear here."
                }
                retry={
                  bookings.length
                    ? () =>
                        router.replace("/account/bookings", { scroll: false })
                    : () => router.push("/explore")
                }
                retryLabel={
                  bookings.length ? "Clear filters" : "Explore journeys"
                }
              />
            )}
          </div>
          <aside className={styles.sidebar} aria-label="Journey overview">
            <section className={styles.sideCard}>
              <div className={styles.sideHeading}>
                <h2>
                  <Route size={20} />
                  Journey Timeline
                </h2>
                {filters.month !== "all" && (
                  <span>{monthLabel(filters.month)}</span>
                )}
              </div>
              {!auth.isAuthenticated ? (
                <p className={styles.muted}>
                  Sign in to see your travel timeline.
                </p>
              ) : !visible.length ? (
                <p className={styles.muted}>
                  Your selected journeys will appear here.
                </p>
              ) : (
                <ol className={styles.timeline}>
                  {visible
                    .slice(0, showTimeline ? visible.length : 6)
                    .map((b) => (
                      <li key={b.id} data-pending={b.status === "pending"}>
                        <button
                          type="button"
                          onClick={() => onAction(b, "details")}
                        >
                          <small>
                            {bookingDate(b.date)}
                            {b.time ? ` · ${bookingTime(b.time)}` : ""}
                          </small>
                          <strong>
                            {b.kind === "transport" && b.from && b.to
                              ? `${b.from} → ${b.to}`
                              : b.kind === "hotel"
                                ? `Check-in ${b.title}`
                                : b.title}
                          </strong>
                          <span>
                            {b.subtitle || bookingStatusLabel(b.status)}
                          </span>
                        </button>
                      </li>
                    ))}
                </ol>
              )}
              {visible.length > 6 && (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  {showTimeline ? "Show fewer journeys" : "Show all journeys"}
                </button>
              )}
              <button
                type="button"
                className={styles.wideSoftButton}
                disabled={exporting || !visible.some(canDownloadPass)}
                onClick={() => {
                  void exportPasses();
                }}
              >
                <ArrowDownToLine size={15} />
                {exporting ? "Preparing passes…" : "Download Offline Passes"}
              </button>
            </section>
            <section className={styles.sideCard}>
              <h2>
                <ShieldCheck size={20} />
                Booking Overview
              </h2>
              <p>
                Keep track of your active bookings and their current payment
                status.
              </p>
              <dl className={styles.summary}>
                <div>
                  <dt>Active bookings</dt>
                  <dd>{auth.isAuthenticated ? active.length : "—"}</dd>
                </div>
                <div>
                  <dt>Awaiting provider approval</dt>
                  <dd>
                    {auth.isAuthenticated
                      ? active.filter((b) => b.status === "pending").length
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Payment under review</dt>
                  <dd>
                    {auth.isAuthenticated
                      ? active.filter((b) =>
                          [
                            "proof_submitted",
                            "under_review",
                            "disputed",
                          ].includes(b.paymentStatus),
                        ).length
                      : "—"}
                  </dd>
                </div>
                {[...paidTotals].map(([currency, total]) => (
                  <div key={currency}>
                    <dt>Paid active bookings</dt>
                    <dd>{bookingMoney(total, currency)}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.smallNote}>
                <Info size={14} />
                Open a booking to see its payment and confirmation details.
              </p>
            </section>
            <section className={styles.assistance}>
              <h2>
                <RadioTower size={20} />
                Before You Travel
              </h2>
              <p>
                Keep your booking code and provider contact details available.
                Confirm pickup, check-in, and meeting arrangements before
                departure.
              </p>
              <button
                type="button"
                className={styles.wideSoftButton}
                disabled={!contacts.length}
                onClick={() => setModal({ action: "contacts" })}
              >
                <Phone size={15} />
                View Provider Contacts
              </button>
              <Link className={styles.wideSoftButton} href="/explore">
                Explore travel options
                <ArrowRight size={15} />
              </Link>
            </section>
          </aside>
        </div>
        {auth.isAuthenticated && query.isSuccess && (
          <button
            type="button"
            className={styles.refresh}
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            <RefreshCw size={14} />
            {query.isFetching ? "Refreshing…" : "Refresh bookings"}
          </button>
        )}
      </div>
      {modal && auth.isAuthenticated && (
        <HomeDialog title={modalTitle} onClose={() => setModal(null)}>
          <div className={styles.dialogBody}>
            {modal.action === "contacts"
              ? contacts.map((b) => (
                  <section
                    className={styles.contactRow}
                    key={b.providerId || b.id}
                  >
                    <h3>{b.providerName || b.title}</h3>
                    <ContactLinks booking={b} />
                  </section>
                ))
              : selected && (
                  <>
                    <p className={styles.dialogCode}>
                      {selected.code || selected.id.slice(-8)}
                    </p>
                    <h3>{selected.title}</h3>
                    {modal.action === "cancel" ? (
                      <>
                        <p>
                          This will cancel your booking for{" "}
                          {bookingDate(selected.date)}. Cancellation and refund
                          eligibility depend on the booking’s policy and current
                          payment status.
                        </p>
                        {selected.cancellationPolicy && (
                          <p className={styles.policy}>
                            {selected.cancellationPolicy}
                          </p>
                        )}
                        <div className={styles.dialogActions}>
                          <button
                            type="button"
                            className={styles.softButton}
                            onClick={() => setModal(null)}
                            disabled={cancellation.isPending}
                          >
                            Keep booking
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            disabled={
                              cancellation.isPending ||
                              !canCancelItinerary(selected)
                            }
                            onClick={() => cancellation.mutate(selected.id)}
                          >
                            {cancellation.isPending
                              ? "Cancelling…"
                              : "Confirm cancellation"}
                          </button>
                        </div>
                      </>
                    ) : modal.action === "contact" ? (
                      <>
                        <p>
                          Contact the provider to confirm your travel
                          arrangements.
                        </p>
                        <ContactLinks booking={selected} />
                      </>
                    ) : modal.action === "location" ? (
                      <>
                        <p>
                          {selected.location ||
                            selected.pickup ||
                            selected.from ||
                            "Meeting location has not been published yet."}
                        </p>
                        {selected.pickup && <p>Pickup: {selected.pickup}</p>}
                        {(selected.location ||
                          selected.pickup ||
                          selected.from) && (
                          <a
                            className={styles.primary}
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location || [selected.pickup, selected.from].filter(Boolean).join(", "))}`}
                          >
                            <MapPin size={16} />
                            Open directions
                          </a>
                        )}
                        <ContactLinks booking={selected} />
                      </>
                    ) : modal.action === "payment" ? (
                      <>
                        <p>{paymentStatusLabel(selected.paymentStatus)}</p>
                        {!selected.paymentId ? (
                          <p>
                            A linked payment record is not available. Contact
                            the provider about payment arrangements.
                          </p>
                        ) : paymentQuery.isPending ? (
                          <p>Loading payment details…</p>
                        ) : paymentQuery.isError ? (
                          <HomeState
                            title="Payment details are temporarily unavailable"
                            description={paymentQuery.error.message}
                            retry={() => {
                              void paymentQuery.refetch();
                            }}
                          />
                        ) : paymentQuery.data ? (
                          <dl className={styles.detailRows}>
                            <div>
                              <dt>Transaction</dt>
                              <dd>
                                {paymentQuery.data.transactionId || "Pending"}
                              </dd>
                            </div>
                            <div>
                              <dt>Status</dt>
                              <dd>
                                {paymentStatusLabel(paymentQuery.data.status)}
                              </dd>
                            </div>
                            <div>
                              <dt>Amount</dt>
                              <dd>
                                {bookingMoney(
                                  paymentQuery.data.amount,
                                  paymentQuery.data.currency,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Method</dt>
                              <dd>
                                {paymentQuery.data.method || "Not selected"}
                              </dd>
                            </div>
                            {paymentQuery.data.expiresAt && (
                              <div>
                                <dt>Payment window</dt>
                                <dd>
                                  {new Date(
                                    paymentQuery.data.expiresAt,
                                  ).toLocaleString("en-GB", {
                                    timeZone: "Asia/Karachi",
                                  })}{" "}
                                  PKT
                                </dd>
                              </div>
                            )}
                          </dl>
                        ) : null}
                        <p>
                          Confirm payment instructions with your provider. This
                          screen does not initiate a transfer.
                        </p>
                        <ContactLinks booking={selected} />
                      </>
                    ) : modal.action === "pass" ? (
                      passQuery.isPending ? (
                        <HomeState
                          loading
                          title="Loading your booking pass…"
                          description="Fetching the issued ticket or voucher."
                        />
                      ) : passQuery.isError ? (
                        <HomeState
                          title="Your pass could not be loaded"
                          description={passQuery.error.message}
                          retry={() => {
                            void passQuery.refetch();
                          }}
                        />
                      ) : passQuery.data ? (
                        <>
                          <BookingDetails booking={selected} />
                          {passQuery.data.qrCode &&
                            /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
                              passQuery.data.qrCode,
                            ) && (
                              <img
                                className={styles.ticketQr}
                                src={passQuery.data.qrCode}
                                width={180}
                                height={180}
                                alt={`Booking QR code for ${selected.code}`}
                              />
                            )}
                          <button
                            type="button"
                            className={styles.primary}
                            onClick={() =>
                              downloadDocument(
                                `banjara-pass-${selected.code || selected.id.slice(-8)}.html`,
                                offlineItineraryHtml([selected], {
                                  [selected.id]: passQuery.data!,
                                }),
                              )
                            }
                          >
                            <Download size={16} />
                            Download offline pass
                          </button>
                        </>
                      ) : null
                    ) : (
                      <>
                        <BookingDetails booking={selected} />
                        {selected.notes && (
                          <p className={styles.policy}>{selected.notes}</p>
                        )}
                        {selected.cancellationPolicy && (
                          <p className={styles.policy}>
                            {selected.cancellationPolicy}
                          </p>
                        )}
                        <div className={styles.dialogActions}>
                          {canDownloadPass(selected) && (
                            <button
                              type="button"
                              className={styles.primary}
                              onClick={() => onAction(selected, "pass")}
                            >
                              <FileText size={16} />
                              View pass
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.softButton}
                            onClick={() => onAction(selected, "payment")}
                          >
                            Payment details
                          </button>
                        </div>
                        <ContactLinks booking={selected} />
                      </>
                    )}
                  </>
                )}
          </div>
        </HomeDialog>
      )}
    </div>
  );
}
function ContactLinks({ booking: b }: { booking: ItineraryBooking }) {
  return (
    <div className={styles.dialogActions}>
      {b.providerUserId && (
        <Link
          className={styles.primary}
          href={`/account/messages?with=${encodeURIComponent(b.providerUserId)}&booking=${encodeURIComponent(b.id)}`}
        >
          Message provider
        </Link>
      )}
      {b.providerPhone && (
        <a
          className={styles.softButton}
          href={`tel:${b.providerPhone.replace(/[^+\d]/g, "")}`}
        >
          <Phone size={15} />
          Call {b.providerName || "provider"}
        </a>
      )}
      {b.providerEmail && (
        <a className={styles.softButton} href={`mailto:${b.providerEmail}`}>
          <Mail size={15} />
          Email provider
        </a>
      )}
      {!b.providerPhone && !b.providerEmail && !b.providerUserId && (
        <p>Provider contact details have not been published yet.</p>
      )}
    </div>
  );
}
function BookingDetails({ booking: b }: { booking: ItineraryBooking }) {
  return (
    <dl className={styles.detailRows}>
      <div>
        <dt>Status</dt>
        <dd>{bookingStatusLabel(b.status)}</dd>
      </div>
      <div>
        <dt>Travel date</dt>
        <dd>
          {bookingDate(b.date)}
          {b.time ? ` · ${bookingTime(b.time)}` : ""}
          {b.endDate && b.endDate !== b.date
            ? ` – ${bookingDate(b.endDate)}`
            : ""}
        </dd>
      </div>
      {b.from && b.to && (
        <div>
          <dt>Route</dt>
          <dd>
            {b.from} → {b.to}
          </dd>
        </div>
      )}
      <div>
        <dt>Provider</dt>
        <dd>{b.providerName || "Provider details unavailable"}</dd>
      </div>
      {b.roomName && (
        <div>
          <dt>Room</dt>
          <dd>
            {b.roomName} · {b.rooms} rooms
          </dd>
        </div>
      )}
      <div>
        <dt>Travelers</dt>
        <dd>
          {b.guests}
          {b.bookingMode === "vehicle"
            ? " · Private vehicle"
            : b.seats.length
              ? ` · Seats ${b.seats.join(", ")}`
              : ""}
        </dd>
      </div>
      {b.location && (
        <div>
          <dt>Location</dt>
          <dd>{b.location}</dd>
        </div>
      )}
      <div>
        <dt>Payment</dt>
        <dd>{paymentStatusLabel(b.paymentStatus)}</dd>
      </div>
      <div>
        <dt>Subtotal</dt>
        <dd>{bookingMoney(b.subtotal, b.currency)}</dd>
      </div>
      {b.tax > 0 && (
        <div>
          <dt>Tax</dt>
          <dd>{bookingMoney(b.tax, b.currency)}</dd>
        </div>
      )}
      {b.serviceFee > 0 && (
        <div>
          <dt>Service fee</dt>
          <dd>{bookingMoney(b.serviceFee, b.currency)}</dd>
        </div>
      )}
      {b.discount > 0 && (
        <div>
          <dt>Discount</dt>
          <dd>− {bookingMoney(b.discount, b.currency)}</dd>
        </div>
      )}
      <div>
        <dt>Total</dt>
        <dd>{bookingMoney(b.total, b.currency)}</dd>
      </div>
    </dl>
  );
}
