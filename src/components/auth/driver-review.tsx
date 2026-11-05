"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Car,
  Clock3,
  IdCard,
  LoaderCircle,
  MapPin,
  Pencil,
  Send,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { DRIVER_STEP_TOTAL, driverStepHref, driverStepNumber } from "@/lib/driver-steps";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getDriverReview,
  submitDriverApplication,
} from "@/services/customer/provider-application.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner } from "./auth-fields";
import styles from "./auth.module.css";
import r from "./review.module.css";

const STEP = driverStepNumber("review");
const CAPTION = `Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`;

const TYPE_LABEL: Record<string, string> = {
  car: "Car",
  jeep: "Jeep",
  suv: "SUV",
  van: "Van",
  mini_bus: "Mini bus",
  bus: "Bus",
};
const INSURER_LABEL: Record<string, string> = {
  jubilee: "Jubilee General Insurance",
  efu: "EFU General Insurance",
  adamjee: "Adamjee Insurance",
  ubl_insurer: "UBL Insurers",
  askari: "Askari General Insurance",
  igi: "IGI Insurance",
  takaful_pakistan: "Takaful Pakistan",
  salaam_takaful: "Salaam Takaful",
  other: "Other",
};
const PRICING_LABEL: Record<string, string> = {
  per_seat: "Per seat",
  per_vehicle: "Per vehicle",
  negotiable: "Negotiable",
};

const rupees = (value: unknown) =>
  Number(value) > 0 ? `Rs ${Number(value).toLocaleString("en-PK")}` : "";
/** Shows only the last digit block, e.g. •••••-•••••67-1. */
const maskCnic = (value: unknown) => {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length === 13 ? `•••••-•••••${d.slice(10, 12)}-${d.slice(12)}` : "";
};

/** Step 8 for local drivers: check everything, then submit for review. */
export function DriverReview() {
  const router = useRouter();
  const { user, loading } = useCustomerAuth();
  const isProvider = user?.role === "provider";
  const backend = useBackendStatus();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isProvider) router.replace("/account");
  }, [loading, user, isProvider, router]);

  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: isProvider,
  });
  const data = application.data;
  const isDriver = Boolean(data?.services.includes("transport"));
  // The review needs steps 3–6 done. CNIC (step 7) can be finished later.
  const earlierHref =
    data?.progress && ["business", "location", "transport", "vehicle"].includes(data.progress.nextStep)
      ? driverStepHref(data.progress.nextStep)
      : null;
  useEffect(() => {
    if (!application.isSuccess) return;
    if (!data) router.replace("/provider-application");
    else if (!isDriver) router.replace("/provider");
    else if (earlierHref) router.replace(earlierHref);
  }, [application.isSuccess, data, isDriver, earlierHref, router]);

  const review = useQuery({
    queryKey: ["provider", "review", user?.id],
    queryFn: getDriverReview,
    enabled: isDriver && !earlierHref,
  });

  if ((application.isError || review.isError) && backend !== "checking") {
    return (
      <AuthShell caption={CAPTION} title="Review & submit">
        <AuthBanner>{(application.error ?? review.error)?.message}</AuthBanner>
      </AuthShell>
    );
  }
  if (loading || !isProvider || backend === "checking" || !data || !isDriver || earlierHref || !review.data) {
    return (
      <AuthShell caption={CAPTION} title="Review & submit">
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Loading your application…
        </p>
      </AuthShell>
    );
  }
  return <ReviewBody userId={user.id} review={review.data} />;
}

type Review = Awaited<ReturnType<typeof getDriverReview>>;

function ReviewBody({ userId, review }: { userId: string; review: Review }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = review.transport as Record<string, unknown>;
  const vehicle = review.vehicle;
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitted = review.nextStep === "submitted" || Boolean(review.submittedAt);
  // CNIC verification is recommended but not required: an unverified CNIC is
  // checked by the BANJARA team during review.
  const canSubmit = !submitted;

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await submitDriverApplication();
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      await queryClient.fetchQuery({
        queryKey: ["provider", "application", userId],
        queryFn: getProviderApplication,
        // Always ask the server: the step just saved changed what comes next.
        staleTime: 0,
      });
      router.replace("/provider");
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "We couldn’t submit your application. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const routes = Array.isArray(t.operatingRoutes) ? (t.operatingRoutes as string[]) : [];
  const fare =
    t.pricingMethod === "negotiable"
      ? "Negotiable"
      : [rupees(t.priceAmount), PRICING_LABEL[String(t.pricingMethod)]?.toLowerCase()].filter(Boolean).join(" · ");

  return (
    <AuthShell
      wide
      caption={CAPTION}
      title="Review & submit"
      step={{ current: STEP, total: DRIVER_STEP_TOTAL }}
      subtitle="Check your details before sending them to BANJARA. You can still change anything now."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}

        <Card icon={UserRound} title="Your details" step={3} editHref="/provider-application?edit=details">
          <Row label="Name" value={review.ownerName} />
          <Row label="Phone" value={review.phone} />
          <Row label="Email" value={review.email} />
          <Row label="Driving experience" value={`${review.yearsExperience} ${review.yearsExperience === 1 ? "year" : "years"}`} />
          <Row label="About you" value={review.description} wide />
        </Card>

        <Card icon={MapPin} title="Your location" step={4} editHref="/provider-application/location">
          <Row label="City" value={review.city} />
          <Row label="Pinned on the map" value={review.pin ? "Yes" : "Not yet"} />
          <Row label="Address" value={review.address} wide />
        </Card>

        <Card icon={Car} title="You & your vehicle" step={5} editHref="/provider-application/vehicle">
          <Row label="Vehicle" value={[TYPE_LABEL[String(t.vehicleClass)], t.vehicleModel, t.vehicleMakeYear].filter(Boolean).join(" · ")} />
          <Row label="Registration" value={String(t.registrationNumber ?? "")} />
          <Row label="Registered to" value={String(t.ownerName ?? "")} />
          <Row label="CNIC" value={maskCnic(t.driverCnic)} />
          <Row label="Driving licence" value={String(t.driverLicenseNumber ?? "")} />
          <Row label="Emergency contact" value={String(t.driverEmergencyContact ?? "")} />
          <Row label="Insurance" value={[INSURER_LABEL[String(t.insuranceCompany)], t.insuranceYear].filter(Boolean).join(" · ")} />
          <Row label="Policy number" value={String(t.insuranceNumber ?? "")} />
        </Card>

        <Card icon={Wallet} title="Routes & fares" step={5} editHref="/provider-application/vehicle">
          <Row label="Routes" value={routes.join(", ") || "None added"} wide />
          <Row label="Fare" value={fare} />
          <Row label="Advance" value={t.pricePercent != null ? `${t.pricePercent}%` : "None"} />
        </Card>

        <Card icon={BadgeCheck} title="Vehicle setup" step={6} editHref="/provider-application/vehicle-setup">
          <Row label="Name" value={vehicle?.name ?? ""} />
          <Row label="Passenger seats" value={vehicle?.seatCount ? String(vehicle.seatCount) : ""} />
          <Row label="Amenities" value={vehicle?.amenities.join(", ") || "None"} wide />
          {vehicle?.images.length ? (
            <div className={r.thumbs}>
              {vehicle.images.slice(0, 5).map((url) => (
                <img key={url} src={url} alt="" />
              ))}
            </div>
          ) : null}
        </Card>

        <Card icon={IdCard} title="CNIC verification" step={7} editHref="/provider-application/cnic" editLabel={review.cnicVerified ? "View" : "Open"} plain>
          {review.cnicVerified ? (
            <p className={r.statusOk}>
              <BadgeCheck size={15} /> Verified
            </p>
          ) : (
            <p className={r.statusWait}>
              <Clock3 size={15} /> Not verified yet. You can still submit — our team will check your CNIC during review.
            </p>
          )}
        </Card>

        {submitted ? (
          <AuthBanner tone="success">
            Your application has been submitted. Our team will review it, usually within 1–2 working days.
          </AuthBanner>
        ) : (
          <div className={r.submit}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={!canSubmit}
              />
              <span>
                I confirm these details are true and that I drive this vehicle myself on every ride.
              </span>
            </label>
            {!review.cnicVerified ? (
              <p className={styles.note}>
                <IdCard size={15} />
                <span>
                  Your CNIC isn’t verified yet. Verifying it now usually means a faster approval.{" "}
                  <Link href="/provider-application/cnic" className={styles.link}>
                    Verify your CNIC
                  </Link>
                </span>
              </p>
            ) : null}
            <button
              type="button"
              className={styles.primary}
              disabled={!canSubmit || !confirmed || submitting}
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
  editLabel = "Edit",
  plain = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  step: number;
  editHref?: string;
  editLabel?: string;
  /** Free content instead of label/value rows. */
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
            <Pencil size={13} /> {editLabel}
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
