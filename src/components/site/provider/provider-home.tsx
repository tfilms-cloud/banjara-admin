"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// The site's query hook waits until the backend is confirmed online; the plain one
// races the cache reset that happens when the connection check completes.
import { useBackendStatus, useQuery } from "@/lib/live-query";
import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardList,
  Hourglass,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import {
  getProviderApplication,
  type ProviderApplication,
} from "@/services/customer/auth.service";
import { DRIVER_STEPS, driverStepHref } from "@/lib/driver-steps";
import type { DriverStep } from "@/services/customer/auth.service";
import styles from "./provider-home.module.css";

const SERVICE_NAMES: Record<string, string> = {
  transport: "Local driver",
  carRental: "Local driver",
  hotel: "Lodging",
  tour: "Tour operator",
  travelGuide: "Guide",
  restaurant: "Restaurant",
};

type Stage = {
  tone: "info" | "wait" | "ok" | "bad";
  icon: LucideIcon;
  badge: string;
  title: string;
  body: string;
  steps: string[];
};

/** A driver who has submitted and is waiting for BANJARA's review. */
function submittedStage(cnicVerified: boolean): Stage {
  return {
    tone: "wait",
    icon: Hourglass,
    badge: "Under review",
    title: "Your application is with our team",
    body: "Thanks for applying. We’re checking your details and vehicle — this usually takes 1–2 working days. We’ll notify you as soon as you’re approved.",
    steps: [
      ...(cnicVerified
        ? []
        : ["Your CNIC wasn’t verified online, so our team will check it by hand. You may be asked for a clearer photo."]),
      "We review your details, vehicle photos and documents.",
      "If anything needs a fix, we’ll tell you what to change.",
      "Once approved, publish your first ride from My trips, here or in the BANJARA app.",
    ],
  };
}

/** A driver part-way through their application. */
function driverStage(): Stage {
  return {
    tone: "wait",
    icon: Hourglass,
    badge: "Application in progress",
    title: "Your application, step by step",
    body: "Your progress is saved after every step, on the website and in the BANJARA app.",
    steps: [],
  };
}

function stageFor(application: ProviderApplication | null): Stage {
  if (!application) {
    return {
      tone: "info",
      icon: ClipboardList,
      badge: "Application not started",
      title: "Start your provider application",
      body: "Your provider account is ready. Choose the service you offer and add your basic details here — it takes about two minutes.",
      steps: [
        "Choose your service and add your details on this website.",
        "Open the BANJARA app and sign in with this account.",
        "Pin your location, add photos and verify your CNIC. Drivers also register their vehicle.",
        "Submit for review. We’ll notify you once you’re approved.",
      ],
    };
  }
  switch (application.verificationStatus) {
    case "approved":
      return {
        tone: "ok",
        icon: BadgeCheck,
        badge: "Approved",
        title: "You’re approved to offer services",
        body: "Manage your listings, rides, bookings and earnings from the BANJARA app.",
        steps: [
          "Open the BANJARA app and sign in with this account.",
          "Publish trips, rooms, tours or offers from your dashboard.",
          "Reply to travellers and confirm bookings in Messages.",
        ],
      };
    case "rejected":
      return {
        tone: "bad",
        icon: CircleAlert,
        badge: "Not approved",
        title: "Your application needs changes",
        body: "Our team couldn’t approve your application. Open the BANJARA app to see the reason, update your details and submit again.",
        steps: [
          "Open the BANJARA app and sign in with this account.",
          "Review the notes on your application status screen.",
          "Update the details and resubmit for review.",
        ],
      };
    case "suspended":
      return {
        tone: "bad",
        icon: CircleAlert,
        badge: "Suspended",
        title: "Your provider account is suspended",
        body: "Your services are hidden from travellers for now. Contact BANJARA support from the app to resolve this.",
        steps: ["Open the BANJARA app and go to Help & support."],
      };
    default:
      return {
        tone: "wait",
        icon: Hourglass,
        badge: "Application in progress",
        title: "Finish your application in the BANJARA app",
        body: "Your service and details are saved. Complete the remaining steps in the BANJARA app — they need your phone’s camera and location. Once submitted, review usually takes 1–2 working days.",
        steps: [
          "Open the BANJARA app and sign in with this account. Your details will already be there.",
          "Pin your exact location on the map.",
          "Add your service details and photos. Drivers register the one vehicle they drive.",
          "Verify your CNIC, review everything and submit.",
        ],
      };
  }
}

export function ProviderHome() {
  const router = useRouter();
  const { user, loading, logout } = useCustomerAuth();
  const isProvider = user?.role === "provider";

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

  // An application in progress continues step by step: send the provider to their
  // next page instead of showing this status page (it is for review and results).
  const pending = application.data === null || application.data?.verificationStatus === "pending";
  const continueHref = application.isSuccess
    ? application.data === null
      ? "/provider-application"
      : pending
        ? driverStepHref(application.data.progress?.nextStep)
        : null
    : null;
  useEffect(() => {
    if (continueHref) router.replace(continueHref);
  }, [continueHref, router]);

  const backend = useBackendStatus();
  if (loading || !isProvider || backend === "checking" || application.isPending || continueHref) {
    return (
      <section className={styles.page}>
        <div className={styles.loading} role="status">
          <LoaderCircle size={22} className="animate-spin" /> Checking your application…
        </div>
      </section>
    );
  }

  if (application.isError) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>We couldn’t check your application</h1>
          <p className={styles.body}>{application.error.message}</p>
          <button type="button" className={styles.primary} onClick={() => void application.refetch()}>
            <RefreshCw size={17} /> Try again
          </button>
        </div>
      </section>
    );
  }

  const data = application.data;
  const progress = data?.verificationStatus === "pending" ? data.progress : undefined;
  const stage =
    progress?.nextStep === "submitted"
      ? submittedStage(progress.cnicVerified !== false)
      : progress
        ? driverStage()
        : stageFor(data);
  const Icon = stage.icon;
  const service = data?.services?.[0];
  // Drivers can do some steps on the website; link the next one when it has a page.
  const nextHref = data?.verificationStatus === "pending" ? driverStepHref(data.progress?.nextStep) : null;

  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>SERVICE PROVIDER</p>
      <h1 className={styles.heading}>Hi {user.name.split(" ")[0] || "there"}</h1>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={`${styles.icon} ${styles[stage.tone]}`}>
            <Icon size={21} />
          </span>
          <div>
            <span className={`${styles.badge} ${styles[stage.tone]}`}>{stage.badge}</span>
            <h2 className={styles.title}>{stage.title}</h2>
          </div>
        </div>
        <p className={styles.body}>{stage.body}</p>

        <dl className={styles.facts}>
          <div>
            <dt>Account</dt>
            <dd>{user.email}</dd>
          </div>
          {service ? (
            <div>
              <dt>Service</dt>
              <dd>{SERVICE_NAMES[service] ?? service}</dd>
            </div>
          ) : null}
          {data?.businessName ? (
            <div>
              <dt>Listed as</dt>
              <dd>{data.businessName}</dd>
            </div>
          ) : null}
        </dl>

        {progress && progress.nextStep !== "submitted" ? (
          <ol className={styles.stepper} aria-label="Your application">
            {DRIVER_STEPS.map((step, index) => {
              const done =
                index < 2 || progress.completedSteps.includes(step.key as DriverStep);
              const current = step.key === progress.nextStep;
              return (
                <li
                  key={step.key}
                  className={done ? styles.stepDone : current ? styles.stepCurrent : undefined}
                  aria-current={current ? "step" : undefined}
                >
                  <span className={styles.stepDot}>
                    {done ? <Check size={13} /> : index + 1}
                  </span>
                  <span>
                    <strong>{step.label}</strong>
                    {current ? (
                      <small>
                        {step.path
                          ? "Next step"
                          : "Next step · coming to the website soon. You can complete it in the BANJARA app now."}
                      </small>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={styles.steps}>
            <h3>
              <Smartphone size={16} />{" "}
              {progress?.nextStep === "submitted" ? "What happens next" : "Next steps in the BANJARA app"}
            </h3>
            <ol>
              {stage.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        <div className={styles.actions}>
          {!data ? (
            <Link href="/provider-application" className={styles.primaryAction}>
              Choose your service
            </Link>
          ) : nextHref ? (
            <Link href={nextHref} className={styles.primaryAction}>
              Continue your application
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void application.refetch()}
            disabled={application.isFetching}
          >
            <RefreshCw size={16} className={application.isFetching ? "animate-spin" : undefined} />
            Refresh status
          </button>
          <Link href="/" className={styles.secondary}>
            Browse BANJARA
          </Link>
          <button type="button" className={styles.ghost} onClick={() => void logout()}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
