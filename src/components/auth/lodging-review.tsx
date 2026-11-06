"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  Camera,
  LoaderCircle,
  MapPin,
  Pencil,
  Send,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { lodgingStepNumber } from "@/lib/driver-steps";
import { useQuery } from "@/lib/live-query";
import {
  LODGING_TYPES,
  ROOM_TYPES,
  getMyHotel,
  listMyRooms,
  submitLodgingApplication,
  type LodgingProfile,
} from "@/services/customer/lodging.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner } from "./auth-fields";
import { LodgingGate, lodgingCaption, lodgingStep, useLodgingStep } from "./lodging-shared";
import styles from "./auth.module.css";
import r from "./review.module.css";

const TITLE = "Review & submit";
const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;
const time = (value?: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!m) return value ?? "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

/** Lodging step 8: everything on one page, with an Edit link per section. */
export function LodgingReview() {
  const { profile, ready, error } = useLodgingStep("review");
  if (error) return <LodgingGate step="review" title={TITLE} error={error} />;
  if (!ready || !profile) return <LodgingGate step="review" title={TITLE} />;
  return <Review profile={profile} />;
}

function Review({ profile }: { profile: LodgingProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hotel = useQuery({ queryKey: ["provider", "my-hotel"], queryFn: getMyHotel });
  const rooms = useQuery({
    queryKey: ["provider", "rooms", hotel.data?.id],
    queryFn: () => listMyRooms(hotel.data!.id),
    enabled: Boolean(hotel.data?.id),
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const d = profile.details;
  const submitted = profile.progress?.nextStep === "submitted";
  const photos = [...(d.outlookImages ?? []), ...(d.roomImages ?? []), ...(d.restaurantImages ?? [])];

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await submitLodgingApplication();
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      router.replace("/provider");
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "We couldn’t submit your application.");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      wide
      caption={lodgingCaption("review")}
      title={TITLE}
      step={lodgingStep("review")}
      subtitle="Check your property before sending it to BANJARA. You can still change anything now."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}

        <Card icon={UserRound} title="Your details" step={3} editHref="/provider-application?edit=details">
          <Row label="Listed as" value={profile.businessName} />
          <Row label="Owner" value={profile.ownerName} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Email" value={profile.email} />
          <Row label="About" value={profile.description} wide />
        </Card>

        <Card icon={MapPin} title="Property location" step={lodgingStepNumber("location")} editHref="/provider-application/location">
          <Row label="Pinned on the map" value={profile.location ? "Yes" : "Not yet"} />
          <Row label="City" value={String(d.city ?? profile.city)} />
          <Row label="Address" value={String(d.address ?? profile.address)} wide />
        </Card>

        <Card icon={Building2} title="Property details" step={lodgingStepNumber("property")} editHref="/provider-application/property">
          <Row label="Name" value={String(d.hotelName ?? "")} />
          <Row label="Type" value={LODGING_TYPES.find((t) => t.value === d.hotelType)?.label ?? ""} />
          <Row label="Manager" value={String(d.managerName ?? "")} />
          <Row label="Mobile" value={String(d.phone ?? "")} />
          <Row label="Village / district" value={[d.village, d.district].filter(Boolean).join(", ")} />
          <Row label="Registration no." value={String(d.businessRegistrationNumber ?? "")} />
          <Row label="Check-in / out" value={d.checkInTime ? `${time(d.checkInTime)} / ${time(d.checkOutTime)}` : ""} />
          <Row label="Restaurant" value={d.restaurantAvailable === "yes" ? "Yes" : d.restaurantAvailable === "no" ? "No" : ""} />
          <Row label="Facilities" value={(d.amenities ?? []).join(", ")} wide />
        </Card>

        <Card icon={Camera} title="Photos" step={lodgingStepNumber("photos")} editHref="/provider-application/photos" plain>
          {photos.length ? (
            <div className={r.thumbs}>
              {photos.slice(0, 8).map((url) => (
                <img key={url} src={url} alt="" />
              ))}
            </div>
          ) : (
            <p className={styles.hint}>No photos yet.</p>
          )}
        </Card>

        <Card icon={BedDouble} title="Rooms" step={lodgingStepNumber("rooms")} editHref="/provider-application/rooms" plain>
          {rooms.isPending ? (
            <p className={styles.hint}>Loading rooms…</p>
          ) : rooms.data?.length ? (
            <dl className={r.rows}>
              {rooms.data.map((room) => (
                <Row
                  key={room.id}
                  label={room.name}
                  value={`${ROOM_TYPES.find((t) => t.value === room.roomType)?.label ?? room.roomType} · ${room.capacity} guests · ${room.totalRooms} ${room.totalRooms === 1 ? "room" : "rooms"} · ${rupees(room.pricePerNight)} a night`}
                  wide
                />
              ))}
            </dl>
          ) : (
            <p className={styles.hint}>No rooms yet.</p>
          )}
        </Card>

        {submitted ? (
          <AuthBanner tone="success">
            Your application has been submitted. Our team will review it, usually within 1–2 working days.
          </AuthBanner>
        ) : (
          <div className={r.submit}>
            <label className={styles.check}>
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>I confirm these details are true and that I run or manage this property.</span>
            </label>
            <button
              type="button"
              className={styles.primary}
              disabled={!confirmed || submitting}
              onClick={() => void submit()}
            >
              {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function Card({
  icon: Icon,
  title,
  step,
  editHref,
  plain = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  step: number;
  editHref?: string;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={r.card} aria-label={title}>
      <header className={r.cardHead}>
        <span className={r.cardIcon}>
          <Icon size={17} />
        </span>
        <div className={r.cardTitle}>
          <small>Step {step}</small>
          <h2>{title}</h2>
        </div>
        {editHref ? (
          <Link href={editHref} className={r.edit}>
            <Pencil size={13} /> Edit
          </Link>
        ) : null}
      </header>
      {plain ? <div>{children}</div> : <dl className={r.rows}>{children}</dl>}
    </section>
  );
}

function Row({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? r.rowWide : undefined}>
      <dt>{label}</dt>
      <dd>{value || <span className={r.missing}>Not added</span>}</dd>
    </div>
  );
}
