"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Heart,
  IdCard,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Palette,
  Phone,
  RadioTower,
  ShieldCheck,
  Star,
  Sun,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { HomeState } from "@/components/site/home/home-primitives";
import { useSavedDestinations } from "@/hooks/use-saved-destinations";
import { safeChatUrl } from "@/lib/customer-chat";
import {
  profileBookingSummary,
  profileFields,
  validateProfile,
} from "@/lib/customer-profile";
import {
  bookingMoney,
  bookingTab,
  paymentStatusLabel,
} from "@/lib/booking-itineraries";
import { EXPLORE_DESTINATIONS } from "@/lib/explore-destinations";
import { getBookingItineraries } from "@/services/customer/itinerary.service";
import {
  applyCustomerProfile,
  getCustomerProfile,
  getCustomerSavedItems,
  saveCustomerProfile,
} from "@/services/customer/profile.service";
import type { AuthUser } from "@/types/auth";
import type { CustomerProfile, ProfileFields } from "@/types/customer/profile";
import type { ItineraryBooking } from "@/types/customer/itinerary-booking";
import { ProfileDialogs, type ProfileDialog } from "./profile-dialogs";
import styles from "./profile.module.css";

function bookingHref(booking: ItineraryBooking) {
  return `/account/bookings?status=${bookingTab(booking.status)}&q=${encodeURIComponent(booking.code)}`;
}
function memberSince(date?: string) {
  const value = Date.parse(date || "");
  return Number.isFinite(value)
    ? new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }).format(value)
    : "";
}
export function WebsiteProfile() {
  const auth = useCustomerAuth();
  return (
    <>
      {auth.loading ? (
        <section className={styles.page}>
          <HomeState
            title="Loading your account…"
            description="Restoring your customer session."
            loading
          />
        </section>
      ) : !auth.isAuthenticated ? (
        <section className={styles.page}>
          <div className={styles.guest}>
            <UserRound size={35} />
            <h1>Your BANJARA account</h1>
            <p>
              Sign in to manage your profile, bookings and travel preferences.
            </p>
            <Link className={styles.primary} href="/account?auth=signin&next=%2Faccount">
              Sign in
            </Link>
          </div>
        </section>
      ) : (
        <ProfileWorkspace key={auth.user!.id} user={auth.user!} />
      )}
    </>
  );
}
function ProfileWorkspace({ user }: { user: AuthUser }) {
  const client = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["customer", "profile", user.id],
    queryFn: getCustomerProfile,
    staleTime: 30000,
  });
  const bookingQuery = useQuery({
    queryKey: ["customer", "itineraries", user.id],
    queryFn: getBookingItineraries,
    staleTime: 20000,
  });
  const savedQuery = useQuery({
    queryKey: ["customer", "profile-favorites", user.id],
    queryFn: getCustomerSavedItems,
    staleTime: 20000,
  });
  const destinations = useSavedDestinations();
  const [dialog, setDialog] = useState<ProfileDialog>(null),
    [selected, setSelected] = useState("personal-info");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem(`banjara_profile_appearance_${user.id}`) ===
        "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });
  const [avatarFailed, setAvatarFailed] = useState("");
  const profile =
    profileQuery.data?.id === user.id ? profileQuery.data : undefined;
  const person = profile ?? user;
  const bookings = bookingQuery.data ?? [],
    saved = savedQuery.data ?? [];
  const localSaved = EXPLORE_DESTINATIONS.filter((d) =>
    destinations.saved.has(d.id),
  ).map((d) => d.id);
  const summary = profileBookingSummary(bookings);
  const countReady = bookingQuery.isSuccess;
  const savedReady = savedQuery.isSuccess && !destinations.pending;
  const onProfile = (next: CustomerProfile) =>
    client.setQueryData(["customer", "profile", user.id], next);
  const open = (value: ProfileDialog) => {
    setSelected(value || "personal-info");
    setDialog(value);
  };
  const contacts = [
    ...new Map(
      bookings
        .filter((b) => b.providerPhone || b.providerUserId)
        .map((b) => [b.providerId, b]),
    ).values(),
  ].slice(0, 2);
  const changeTheme = (next: "light" | "dark") => {
    setTheme(next);
    try {
      localStorage.setItem(`banjara_profile_appearance_${user.id}`, next);
    } catch {
      toast.warning(
        "Appearance changed for this visit. Your browser could not save it.",
      );
    }
  };
  return (
    <section className={styles.page} data-theme={theme}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/account">My Account</Link>
          <span>›</span>
          <strong>Profile & Settings</strong>
        </nav>
        <div className={styles.pageHeading}>
          <div>
            <h1>Nomad Account & Profile</h1>
            <div className={styles.headingTags}>
              <span>
                <b />
                {person.role === "provider"
                  ? "Provider account"
                  : "Traveler account"}
              </span>
              <span>
                <Leaf size={12} /> Your journey, your way
              </span>
            </div>
          </div>
          <span className={styles.accountStatus}>
            <b />{" "}
            {person.status === "active"
              ? "ACCOUNT ACTIVE"
              : "YOUR BANJARA ACCOUNT"}
          </span>
        </div>
        <div className={styles.identity}>
          <div className={styles.person}>
            <div className={styles.avatar}>
              <div>
                {safeChatUrl(person.avatar) &&
                avatarFailed !== person.avatar ? (
                  <img
                    src={safeChatUrl(person.avatar)}
                    alt={`${person.name}'s profile photo`}
                    onError={() => setAvatarFailed(person.avatar || "")}
                  />
                ) : (
                  <span aria-label="Profile initials">
                    {person.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase() || "B"}
                  </span>
                )}
              </div>
              <button
                aria-label="Update profile photo"
                onClick={() => open("photo")}
              >
                <Camera size={16} />
              </button>
            </div>
            <div className={styles.personCopy}>
              <h2>{person.name}</h2>
              <p>
                <Mail size={14} />
                <span>{person.email}</span>
              </p>
              {memberSince(person.createdAt) && (
                <p>
                  <CalendarDays size={13} />
                  <span>
                    {memberSince(person.createdAt)}
                    {profile && profileFields(profile).baseCity
                      ? ` · ${profileFields(profile).baseCity}`
                      : ""}
                  </span>
                </p>
              )}
              <p>
                <Phone size={13} />
                <span>{person.phone}</span>
              </p>
              <a
                className={styles.softButton}
                href="#personal-info"
                onClick={() => {
                  setSelected("personal-info");
                  document
                    .getElementById("profile-name")
                    ?.focus({ preventScroll: true });
                }}
              >
                <IdCard size={14} /> Edit Profile
              </a>
            </div>
          </div>
          <Stat label="Completed" icon={<Compass size={17} />}>
            <strong>
              {countReady ? summary.completed.length : "—"} Journeys
            </strong>
            <div className={styles.destinationTags}>
              {summary.destinations.length ? (
                summary.destinations.map((value) => (
                  <span key={value}>{value}</span>
                ))
              ) : (
                <small>Trips, stays, tours & guides</small>
              )}
            </div>
          </Stat>
          <Stat label="Saved" icon={<Bookmark size={16} />}>
            <button className={styles.statAction} onClick={() => open("saved")}>
              <strong>
                {savedReady ? saved.length + localSaved.length : "—"} Saved
              </strong>
              <small>Places, rides & providers</small>
            </button>
          </Stat>
          <Stat label="Reputation" icon={<Star size={17} />}>
            <strong aria-label="Guest score unavailable">
              — <span className={styles.star}>★</span>
            </strong>
            <small>Guest ratings are not available yet.</small>
          </Stat>
          <Stat
            label="Active journey"
            icon={<span className={styles.tealDot} />}
            accent
          >
            {countReady ? (
              summary.next ? (
                <Link
                  className={styles.activeJourney}
                  href={bookingHref(summary.next)}
                >
                  <strong>
                    {summary.next.providerName || summary.next.title}
                  </strong>
                  <small>
                    {summary.next.from && summary.next.to
                      ? `${summary.next.from} → ${summary.next.to}`
                      : summary.next.subtitle || summary.next.title}
                  </small>
                  <b>#{summary.next.code} ↗</b>
                </Link>
              ) : (
                <>
                  <strong>No active journey</strong>
                  <Link href="/explore">Plan your next trip ↗</Link>
                </>
              )
            ) : (
              <strong>—</strong>
            )}
          </Stat>
        </div>
        <div className={styles.contentGrid}>
          <aside className={styles.sidebar}>
            <nav className={styles.accountNav} aria-label="Account sections">
              <a
                href="#personal-info"
                aria-current={selected === "personal-info" ? "true" : undefined}
                onClick={() => setSelected("personal-info")}
              >
                <IdCard size={18} />
                <span>Personal Info & Details</span>
                <ChevronRight size={16} />
              </a>
              <a
                href="#appearance"
                aria-current={selected === "appearance" ? "true" : undefined}
                onClick={() => setSelected("appearance")}
              >
                <Palette size={18} />
                <span>Appearance & Display</span>
              </a>
              <Link href="/account/bookings">
                <Ticket size={18} />
                <span>My Bookings & Passes</span>
                {countReady && <small>{summary.active.length} Active</small>}
              </Link>
              <a
                href="#payments"
                aria-current={selected === "payments" ? "true" : undefined}
                onClick={() => setSelected("payments")}
              >
                <Wallet size={18} />
                <span>Payments & Transactions</span>
              </a>
              <button
                onClick={() => open("saved")}
                aria-current={selected === "saved" ? "true" : undefined}
              >
                <Heart size={18} />
                <span>Saved & Favorites</span>
                {savedReady && (
                  <small>{saved.length + localSaved.length}</small>
                )}
              </button>
              <button
                onClick={() => open("notifications")}
                aria-current={selected === "notifications" ? "true" : undefined}
              >
                <Bell size={18} />
                <span>Notifications & Updates</span>
              </button>
              <a
                href="#travel-support"
                aria-current={
                  selected === "travel-support" ? "true" : undefined
                }
                onClick={() => setSelected("travel-support")}
              >
                <ShieldCheck size={18} />
                <span>Travel Preparation & Support</span>
                <b className={styles.tealDot} />
              </a>
              <button
                className={styles.logoutRow}
                onClick={() => open("security")}
              >
                <LogOut size={18} />
                <span>Security & Log Out</span>
              </button>
            </nav>
            <div className={styles.community}>
              <h3>
                <ShieldCheck size={18} /> Explore with local providers
              </h3>
              <p>
                Plan mountain rides, stays, tours and guide services with
                providers across northern Pakistan.
              </p>
              <Link href="/explore">
                <Leaf size={13} /> Find your next adventure
              </Link>
            </div>
            <p className={styles.brandNote}>
              BANJARA Web
              <br />
              <span>Your journey. Your seat. Your way.</span>
            </p>
          </aside>
          <div className={styles.sections}>
            <section id="personal-info" className={styles.panel}>
              <PanelHeading
                icon={<IdCard size={21} />}
                title="Personal Information"
                description="Keep your account and travel contact details up to date."
                badge="YOUR TRAVEL PROFILE"
              />
              {profileQuery.isPending ? (
                <HomeState
                  title="Loading your profile…"
                  description="Fetching your current account details."
                  loading
                />
              ) : profileQuery.isError ? (
                <HomeState
                  title="Could not load your profile"
                  description={profileQuery.error.message}
                  retry={() => void profileQuery.refetch()}
                />
              ) : profile ? (
                <PersonalInformation profile={profile} onProfile={onProfile} />
              ) : (
                <HomeState
                  title="Profile unavailable"
                  description="Refresh your account to try again."
                  retry={() => void profileQuery.refetch()}
                />
              )}
            </section>
            <section id="appearance" className={styles.panel}>
              <PanelHeading
                icon={<Moon size={20} />}
                title="Appearance & Display"
                description="Choose the contrast that feels comfortable for your account page."
              />
              <div className={styles.appearance}>
                <span className={styles.sunIcon}>
                  {theme === "light" ? <Sun size={22} /> : <Moon size={22} />}
                </span>
                <div>
                  <h3>
                    {theme === "light"
                      ? "Daylight contrast"
                      : "Evening contrast"}
                  </h3>
                  <p>
                    {theme === "light"
                      ? "A clear, bright view for planning your journey."
                      : "A softer account view for low-light browsing."}
                  </p>
                </div>
                <div
                  className={styles.themeSwitch}
                  aria-label="Profile appearance"
                >
                  <button
                    aria-pressed={theme === "light"}
                    onClick={() => changeTheme("light")}
                  >
                    <Sun size={15} /> Light Mode
                  </button>
                  <button
                    aria-pressed={theme === "dark"}
                    onClick={() => changeTheme("dark")}
                  >
                    <Moon size={15} /> Dark Mode
                  </button>
                </div>
              </div>
              <p className={styles.caption}>
                Saved on this device for your account page.
              </p>
            </section>
            <section id="payments" className={styles.panel}>
              <PanelHeading
                icon={<Wallet size={20} />}
                title="Payments & Transactions"
                description="Review payment records linked to your BANJARA bookings."
                badge="BOOKING PAYMENT RECORDS"
              />
              {bookingQuery.isError ? (
                <HomeState
                  title="Payment summary unavailable"
                  description="Your booking records could not be loaded."
                  retry={() => void bookingQuery.refetch()}
                />
              ) : (
                <>
                  <div className={styles.paymentTiles}>
                    <div>
                      <span>RECORDED PAID BOOKINGS</span>
                      <h3>
                        {!countReady
                          ? "—"
                          : summary.paid.length
                            ? summary.paid.map((p) => (
                                <span key={p.currency}>
                                  {bookingMoney(p.total, p.currency)}
                                </span>
                              ))
                            : bookingMoney(0)}
                      </h3>
                      <p>
                        Total recorded as paid, excluding refunded bookings.
                      </p>
                    </div>
                    <div>
                      <span>REFUND REQUESTS</span>
                      <h3>
                        {countReady ? summary.refundPending : "—"}
                        <small> pending</small>
                      </h3>
                      <p>Refund progress is shown on the related booking.</p>
                    </div>
                  </div>
                  <h3 className={styles.subheading}>Recent booking payments</h3>
                  {!countReady ? (
                    <p className={styles.caption}>Loading payment records…</p>
                  ) : bookings.length ? (
                    <div className={styles.paymentList}>
                      {[...bookings]
                        .sort(
                          (a, b) =>
                            (Date.parse(b.createdAt) || 0) -
                            (Date.parse(a.createdAt) || 0),
                        )
                        .slice(0, 3)
                        .map((b) => (
                          <Link href={bookingHref(b)} key={b.id}>
                            <span className={styles.paymentIcon}>
                              <Wallet size={19} />
                            </span>
                            <span>
                              <strong>{b.providerName || b.title}</strong>
                              <small>
                                {b.code} · {paymentStatusLabel(b.paymentStatus)}
                              </small>
                            </span>
                            <b>{bookingMoney(b.total, b.currency)}</b>
                            <ChevronRight size={16} />
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <p className={styles.noMethods}>
                      Payment details will appear after you make a booking.
                    </p>
                  )}
                  <Link className={styles.allPayments} href="/account/bookings">
                    <Ticket size={16} /> View booking payment details
                  </Link>
                  <p className={styles.caption}>
                    Payment methods are handled per booking. This summary is not
                    a wallet balance.
                  </p>
                </>
              )}
            </section>
            <section id="travel-support" className={styles.panel}>
              <PanelHeading
                icon={<ShieldCheck size={22} />}
                title="Travel Preparation & Support"
                description="Keep useful contacts and booking details close at hand."
              />
              <div className={styles.safetyTiles}>
                <div>
                  <span>YOUR TRAVEL CONTACTS</span>
                  {bookingQuery.isPending ? (
                    <p>Loading contacts…</p>
                  ) : contacts.length ? (
                    contacts.map((contact) => (
                      <div
                        className={styles.travelContact}
                        key={contact.providerId}
                      >
                        <strong>{contact.providerName || contact.title}</strong>
                        {contact.providerPhone && (
                          <a
                            href={`tel:${contact.providerPhone.replace(/[^+\d]/g, "")}`}
                          >
                            <Phone size={13} />
                            {contact.providerPhone}
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>
                      Find your provider contacts in your confirmed booking
                      details.
                    </p>
                  )}
                </div>
                <div>
                  <span>BEFORE DEPARTURE</span>
                  <h3>Keep the essentials ready</h3>
                  <p>
                    Confirm your meeting point, download issued passes and save
                    your provider’s contact details.
                  </p>
                  <button
                    className={styles.textButton}
                    onClick={() => open("checklist")}
                  >
                    Open travel checklist <ChevronRight size={13} />
                  </button>
                </div>
              </div>
              <div className={styles.relay}>
                <span className={styles.relayIcon}>
                  <RadioTower size={22} />
                </span>
                <div>
                  <h3>Coordinate with your provider</h3>
                  <p>Ask about pickup, check-in and meeting arrangements.</p>
                </div>
                <Link className={styles.secondary} href="/account/messages">
                  <MessageCircle size={15} /> Open Messages
                </Link>
              </div>
            </section>
          </div>
        </div>
        <ProfileDialogs
          savedLoading={savedQuery.isPending || destinations.pending}
          savedError={savedQuery.isError ? savedQuery.error.message : ""}
          retrySaved={() => void savedQuery.refetch()}
          dialog={dialog}
          onClose={() => setDialog(null)}
          ownerId={user.id}
          saved={saved}
          destinations={localSaved}
          onProfile={onProfile}
        />
      </div>
    </section>
  );
}
function Stat({
  label,
  icon,
  children,
  accent = false,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`${styles.stat} ${accent ? styles.accentStat : ""}`}>
      <div className={styles.statLabel}>
        <span>{label}</span>
        {icon}
      </div>
      <div className={styles.statContent}>{children}</div>
    </div>
  );
}
function PanelHeading({
  icon,
  title,
  description,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className={styles.panelHeading}>
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {badge && <small>{badge}</small>}
    </div>
  );
}
function PersonalInformation({
  profile,
  onProfile,
}: {
  profile: CustomerProfile;
  onProfile: (profile: CustomerProfile) => void;
}) {
  const [fields, setFields] = useState<ProfileFields>(() =>
    profileFields(profile),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileFields, string>>
  >({});
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (next: ProfileFields) => saveCustomerProfile(next, profile.id),
    onSuccess: (next) => {
      applyCustomerProfile(next);
      onProfile(next);
      setFields(profileFields(next));
      setSaved(true);
      toast.success("Profile updated");
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = Object.fromEntries(
      ["name", "email", "phone", "baseCity"].map((key) => [
        key,
        String(data.get(key) ?? ""),
      ]),
    ) as ProfileFields;
    const problems = validateProfile(next);
    setErrors(problems);
    setSaved(false);
    if (Object.keys(problems).length) {
      document.getElementById(`profile-${Object.keys(problems)[0]}`)?.focus();
      return;
    }
    mutation.mutate(next);
  };
  return (
    <form onSubmit={submit} noValidate className={styles.profileForm}>
      <div className={styles.fields}>
        {(
          [
            {
              id: "name",
              label: "Full Name",
              type: "text",
              autoComplete: "name",
              max: 120,
            },
            {
              id: "email",
              label: "Email Address",
              type: "email",
              autoComplete: "email",
              max: 254,
            },
            {
              id: "phone",
              label: "Phone Number",
              type: "tel",
              autoComplete: "tel",
              max: 30,
            },
            {
              id: "baseCity",
              label: "Base City",
              type: "text",
              autoComplete: "address-level2",
              max: 120,
            },
          ] as const
        ).map((field) => (
          <label key={field.id} htmlFor={`profile-${field.id}`}>
            <span>
              {field.label}
              {field.id === "email" && <small>Used for sign-in</small>}
            </span>
            <div className={styles.inputWrap}>
              <input
                id={`profile-${field.id}`}
                name={field.id}
                type={field.type}
                autoComplete={field.autoComplete}
                maxLength={field.max}
                value={fields[field.id]}
                onChange={(e) => {
                  setFields({ ...fields, [field.id]: e.target.value });
                  setSaved(false);
                }}
                aria-invalid={!!errors[field.id]}
                aria-describedby={
                  errors[field.id] ? `error-${field.id}` : undefined
                }
                placeholder={
                  field.id === "baseCity"
                    ? "e.g. Islamabad, Pakistan"
                    : undefined
                }
                disabled={mutation.isPending}
                required={field.id !== "baseCity"}
              />
              {field.id === "baseCity" && <MapPin size={17} />}
            </div>
            {errors[field.id] && (
              <small className={styles.error} id={`error-${field.id}`}>
                {errors[field.id]}
              </small>
            )}
          </label>
        ))}
      </div>
      <div className={styles.profileNote}>
        <ShieldCheck size={18} />
        <span>
          Your contact information helps providers coordinate your bookings.
        </span>
      </div>
      {mutation.isError && (
        <p className={styles.error} role="alert">
          {mutation.error.message}
        </p>
      )}
      {saved && (
        <p className={styles.success} role="status">
          <Check size={14} /> Your profile changes are saved.
        </p>
      )}
      <div className={styles.formActions}>
        <button
          className={styles.secondary}
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            setFields(profileFields(profile));
            setErrors({});
            setSaved(false);
            mutation.reset();
          }}
        >
          Cancel
        </button>
        <button className={styles.primary} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
