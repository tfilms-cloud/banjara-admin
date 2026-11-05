"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  IdCard,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { DRIVER_STEP_TOTAL, driverStepHref, driverStepNumber } from "@/lib/driver-steps";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getCnicStatus,
  getMyDriverProfile,
  verifyDriverCnic,
  type CnicCheckResult,
} from "@/services/customer/provider-application.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";
import c from "./cnic.module.css";

const STEP = driverStepNumber("verification");
const CAPTION = `Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`;
const REVIEW = "/provider-application/review";

const digits = (value: string) => value.replace(/\D/g, "");

/** 12345-1234567-1 while typing. */
function formatCnic(value: string) {
  const d = digits(value).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** DD.MM.YYYY while typing, as printed on the card. */
function formatExpiry(value: string) {
  const d = digits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function expiryError(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return "Enter the expiry date as DD.MM.YYYY";
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (date.getMonth() !== Number(mm) - 1 || date.getDate() !== Number(dd)) return "This date doesn’t exist";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return "This CNIC has expired. Renew it before applying.";
  return null;
}

/**
 * Step 7 for local drivers: CNIC verification, using the backend's existing
 * check (the same as the app). It reads the card photos, matches them with the
 * typed details and stores only the result. A NADRA check can replace the
 * matching later without changing this screen.
 */
export function DriverCnic() {
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

  // The CNIC number from step 5, and any earlier check (web or app).
  const profile = useQuery({
    queryKey: ["provider", "driver-profile", user?.id],
    queryFn: getMyDriverProfile,
    enabled: isDriver && !earlierHref,
  });
  const status = useQuery({
    queryKey: ["provider", "cnic-status", user?.id],
    queryFn: getCnicStatus,
    enabled: isDriver && !earlierHref,
  });

  if ((application.isError || status.isError) && backend !== "checking") {
    return (
      <AuthShell caption={CAPTION} title="Verify your CNIC">
        <AuthBanner>{(application.error ?? status.error)?.message}</AuthBanner>
      </AuthShell>
    );
  }
  if (
    loading ||
    !isProvider ||
    backend === "checking" ||
    !data ||
    !isDriver ||
    earlierHref ||
    profile.isPending ||
    status.isPending
  ) {
    return (
      <AuthShell caption={CAPTION} title="Verify your CNIC">
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Loading your application…
        </p>
      </AuthShell>
    );
  }
  return (
    <CnicForm
      userId={user.id}
      savedCnic={String(profile.data?.transport.driverCnic ?? "")}
      alreadyVerified={Boolean(status.data?.verified)}
      maskedCnic={status.data?.cnicMasked}
    />
  );
}

type Phase = "form" | "checking" | "result" | "verified";

function CnicForm({
  userId,
  savedCnic,
  alreadyVerified,
  maskedCnic,
}: {
  userId: string;
  savedCnic: string;
  alreadyVerified: boolean;
  maskedCnic?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [front, setFront] = useState<{ url: string; file: File } | null>(null);
  const [back, setBack] = useState<{ url: string; file: File } | null>(null);
  const [cnic, setCnic] = useState(formatCnic(savedCnic));
  const [father, setFather] = useState("");
  const [expiry, setExpiry] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>(alreadyVerified ? "verified" : "form");
  const [result, setResult] = useState<CnicCheckResult | null>(null);
  const [error, setError] = useState("");

  // Local previews live until replaced or the page closes (not when the result
  // screen hides the photo boxes, so "Try again" still shows them).
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const swap = (
    setter: (value: { url: string; file: File } | null) => void,
    previous: { url: string } | null,
    file: File | null,
  ) => {
    if (previous) URL.revokeObjectURL(previous.url);
    if (!file) return setter(null);
    const url = URL.createObjectURL(file);
    previews.current.push(url);
    setter({ url, file });
  };

  const verify = async () => {
    const next: Record<string, string> = {};
    if (!front) next.front = "Add a photo of the front of your CNIC";
    if (!back) next.back = "Add a photo of the back of your CNIC";
    if (digits(cnic).length !== 13) next.cnic = "Your CNIC number has 13 digits";
    if (father.trim().length < 2) next.father = "Enter your father’s name as printed on the CNIC";
    const expiryProblem = expiryError(expiry);
    if (expiryProblem) next.expiry = expiryProblem;
    setErrors(next);
    if (Object.keys(next).length || !front || !back) return;

    setError("");
    setPhase("checking");
    try {
      const checked = await verifyDriverCnic({
        front: front.file,
        back: back.file,
        cnicNumber: cnic,
        fatherName: father,
        expiryDate: expiry,
      });
      setResult(checked);
      setPhase("result");
      // Progress moves to "review" when verified; refresh what other pages read.
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      void queryClient.fetchQuery({ queryKey: ["provider", "application", userId], queryFn: getProviderApplication, staleTime: 0 });
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "We couldn’t check your CNIC. Please try again.",
      );
      setPhase("form");
    }
  };

  return (
    <AuthShell
      wide
      caption={CAPTION}
      title="Verify your CNIC"
      step={{ current: STEP, total: DRIVER_STEP_TOTAL }}
      subtitle="We check your CNIC so travellers know every BANJARA driver is who they say they are."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {phase === "verified" ? (
          <>
            <div className={`${c.result} ${c.resultOk}`}>
              <div className={c.resultHead}>
                <span className={`${c.resultIcon} ${c.iconOk}`}>
                  <BadgeCheck size={20} />
                </span>
                <div>
                  <span className={`${c.resultBadge} ${c.badgeOk}`}>Verified</span>
                  <h2>Your CNIC is verified</h2>
                  <p>{maskedCnic ? `CNIC ${maskedCnic}. ` : ""}You can review and submit your application.</p>
                </div>
              </div>
              <button type="button" className={c.editLink} onClick={() => setPhase("form")}>
                <RefreshCw size={13} /> Verify a different CNIC
              </button>
            </div>
            <button type="button" className={styles.primary} onClick={() => router.push(REVIEW)}>
              Continue to review <ArrowRight size={16} />
            </button>
          </>
        ) : phase === "result" && result ? (
          <Result
            result={result}
            cnic={cnic}
            father={father}
            expiry={expiry}
            onRetry={() => setPhase("form")}
            onContinue={() => router.push(REVIEW)}
          />
        ) : (
          <>
            <AuthBanner tone="info">
              Your CNIC photos are only read to check the details you enter. BANJARA keeps the result (with your
              CNIC number masked), not the photos.
            </AuthBanner>
            {error ? <AuthBanner>{error}</AuthBanner> : null}

            <section className={v.section} aria-labelledby="sec-card">
              <Head n={1} id="sec-card" title="CNIC photos" sub="Both sides of your original card" />
              <div className={c.cards}>
                <CardPhoto
                  label="CNIC front"
                  side="front"
                  value={front?.url ?? ""}
                  onPick={(file) => swap(setFront, front, file)}
                  error={errors.front}
                  disabled={phase === "checking"}
                />
                <CardPhoto
                  label="CNIC back"
                  side="back"
                  value={back?.url ?? ""}
                  onPick={(file) => swap(setBack, back, file)}
                  error={errors.back}
                  disabled={phase === "checking"}
                />
              </div>
              <ul className={c.tips}>
                <li>Place the card on a plain, dark surface</li>
                <li>All four corners visible, no glare or blur</li>
                <li>The original card — not a photocopy</li>
              </ul>
            </section>

            <section className={v.section} aria-labelledby="sec-details">
              <Head n={2} id="sec-details" title="Confirm details" sub="Exactly as printed on the card" />
              <AuthField
                label="CNIC number *"
                icon={IdCard}
                inputMode="numeric"
                placeholder="35202-1234567-1"
                value={cnic}
                error={errors.cnic}
                disabled={phase === "checking"}
                onChange={(event) => setCnic(formatCnic(event.target.value))}
              />
              <div className={styles.row2}>
                <AuthField
                  label="Father’s name *"
                  icon={UserRound}
                  placeholder="As printed on CNIC"
                  value={father}
                  error={errors.father}
                  disabled={phase === "checking"}
                  onChange={(event) => setFather(event.target.value)}
                />
                <AuthField
                  label="Date of expiry *"
                  icon={CalendarDays}
                  inputMode="numeric"
                  placeholder="DD.MM.YYYY"
                  value={expiry}
                  error={errors.expiry}
                  disabled={phase === "checking"}
                  onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                />
              </div>
            </section>

            <button
              type="button"
              className={styles.primary}
              disabled={phase === "checking"}
              onClick={() => void verify()}
            >
              {phase === "checking" ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {phase === "checking" ? "Checking your CNIC… this can take up to a minute" : "Verify CNIC"}
            </button>
            <Link href={REVIEW} className={c.skip}>
              Skip for now and review your application <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

/** The backend's decision, item by item. */
function Result({
  result,
  cnic,
  father,
  expiry,
  onRetry,
  onContinue,
}: {
  result: CnicCheckResult;
  cnic: string;
  father: string;
  expiry: string;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const ok = result.status === "verified";
  const review = result.status === "manual_review";
  const rows = [
    { label: "CNIC number", value: cnic, matched: result.fields.cnicNumber.matched },
    { label: "Father’s name", value: father, matched: result.fields.fatherName.matched },
    {
      label: "Date of expiry",
      value: expiry,
      matched: result.fields.expiryDate.matched && !result.fields.expiryDate.expired,
    },
  ];
  return (
    <>
      <div className={`${c.result} ${ok ? c.resultOk : review ? "" : c.resultBad}`}>
        <div className={c.resultHead}>
          <span className={`${c.resultIcon} ${ok ? c.iconOk : review ? "" : c.iconBad}`}>
            {ok ? <BadgeCheck size={20} /> : review ? <Clock3 size={20} /> : <CircleAlert size={20} />}
          </span>
          <div>
            <span className={`${c.resultBadge} ${ok ? c.badgeOk : review ? "" : c.badgeBad}`}>
              {ok ? "Verified" : review ? "Needs a closer look" : "Didn’t match"}
            </span>
            <h2>
              {ok
                ? "Your CNIC is verified"
                : review
                  ? "We couldn’t read everything clearly"
                  : "Some details didn’t match your card"}
            </h2>
            <p>
              {ok
                ? "Your details match your card. You can now review and submit your application."
                : review
                  ? "Try clearer photos of the original card in good light. If it still can’t be read, our team will check it by hand when you submit."
                  : result.message || "Check each detail against your card and try again."}
            </p>
          </div>
        </div>
        <ul className={c.rows}>
          {rows.map((row) => (
            <li key={row.label}>
              <span>
                <small>{row.label}</small>
                <strong>{row.value}</strong>
              </span>
              {row.matched ? (
                <em className={c.matched}>
                  <CircleCheck size={14} /> Matched
                </em>
              ) : review ? (
                <em>
                  <Clock3 size={14} /> Couldn’t read
                </em>
              ) : (
                <em className={c.notMatched}>
                  <CircleX size={14} /> Didn’t match
                </em>
              )}
            </li>
          ))}
        </ul>
        {!ok ? (
          <button type="button" className={c.editLink} onClick={onRetry}>
            <RefreshCw size={13} /> Fix details or photos and try again
          </button>
        ) : null}
      </div>
      <button type="button" className={ok ? styles.primary : styles.secondary} onClick={onContinue}>
        {ok ? "Continue to review" : "Review my application for now"} <ArrowRight size={16} />
      </button>
    </>
  );
}

/** CNIC photo shown from the device until "Verify CNIC" sends it for the check. */
function CardPhoto({
  label,
  side,
  value,
  onPick,
  error,
  disabled = false,
}: {
  label: string;
  side: "front" | "back";
  value: string;
  onPick: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProblem("Choose a photo (JPG, PNG or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProblem("This photo is larger than 5 MB. Choose a smaller one.");
      return;
    }
    setProblem("");
    onPick(file);
    if (input.current) input.current.value = "";
  };

  const shown = problem || error;
  return (
    <div className={v.photo}>
      <span className={v.photoLabel} id={`${id}-label`}>
        {label} *
      </span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={v.fileInput}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onChange={(event) => pick(event.target.files?.[0])}
      />
      {value ? (
        <div className={`${v.preview} ${c.card}`}>
          <img src={value} alt={label} />
          {!disabled ? (
            <div className={v.previewActions}>
              <button type="button" onClick={() => input.current?.click()}>
                <RefreshCw size={14} /> Replace
              </button>
              <button type="button" onClick={() => onPick(null)} aria-label={`Remove ${label}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className={`${v.dropzone} ${c.card} ${shown ? v.dropzoneError : ""}`}
          onClick={() => input.current?.click()}
          disabled={disabled}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            pick(event.dataTransfer.files?.[0]);
          }}
        >
          <span className={c.cardOutline} aria-hidden="true">
            {side === "front" ? <span className={c.cardFace} /> : <span className={c.cardStripe} />}
          </span>
          <ImagePlus size={18} />
          <span>Add {side} photo</span>
        </button>
      )}
      {shown ? <span className={v.photoError}>{shown}</span> : null}
    </div>
  );
}

function Head({ n, id, title, sub }: { n: number; id: string; title: string; sub: string }) {
  return (
    <div className={v.sectionHead}>
      <span className={v.sectionNumber}>{n}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{sub}</p>
      </div>
    </div>
  );
}
