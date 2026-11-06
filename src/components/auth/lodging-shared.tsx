"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { LODGING_STEPS, LODGING_STEP_TOTAL, lodgingStepHref, lodgingStepNumber } from "@/lib/driver-steps";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { getLodgingProfile, type LodgingProfile } from "@/services/customer/lodging.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner } from "./auth-fields";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";

export type LodgingStepKey = "property" | "photos" | "rooms" | "review";

const ORDER = LODGING_STEPS.map((step) => step.key);

export function lodgingCaption(step: LodgingStepKey) {
  return `Lodging · Step ${lodgingStepNumber(step)} of ${LODGING_STEP_TOTAL}`;
}

export function lodgingStep(step: LodgingStepKey) {
  return { current: lodgingStepNumber(step), total: LODGING_STEP_TOTAL };
}

/**
 * Shared guard for lodging steps 5–8: signed-in provider, a lodging application,
 * and every earlier step done (otherwise back to the first one missing).
 */
export function useLodgingStep(step: LodgingStepKey) {
  const router = useRouter();
  const { user, loading } = useCustomerAuth();
  const isProvider = user?.role === "provider";
  const backend = useBackendStatus();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isProvider) router.replace("/account");
  }, [loading, user, isProvider, router]);

  const profile = useQuery({
    queryKey: ["provider", "lodging", user?.id],
    queryFn: getLodgingProfile,
    enabled: isProvider,
    staleTime: 0,
  });
  const next = profile.data?.progress?.nextStep;
  // A step later than the next unfinished one is not open yet.
  const earlierHref =
    next && next !== "submitted" && ORDER.indexOf(next as never) < ORDER.indexOf(step) ? lodgingStepHref(next) : null;
  const notLodging = profile.isSuccess && !profile.data.progress;

  useEffect(() => {
    if (!profile.isSuccess) return;
    if (notLodging) router.replace("/provider");
    else if (earlierHref) router.replace(earlierHref);
  }, [profile.isSuccess, notLodging, earlierHref, router]);

  const ready = Boolean(user && isProvider && profile.data && !notLodging && !earlierHref && backend !== "checking");
  return {
    user,
    profile: profile.data as LodgingProfile | undefined,
    ready,
    error: profile.isError && backend !== "checking" ? profile.error : null,
    refetch: profile.refetch,
  };
}

/** Loading / error frame used while a lodging step gets ready. */
export function LodgingGate({
  step,
  title,
  error,
  children,
}: {
  step: LodgingStepKey;
  title: string;
  error?: Error | null;
  children?: ReactNode;
}) {
  return (
    <AuthShell caption={lodgingCaption(step)} title={title}>
      {error ? (
        <AuthBanner>{error.message || "We couldn’t load your application. Refresh the page."}</AuthBanner>
      ) : (
        children ?? (
          <p className={styles.note} role="status">
            <LoaderCircle size={15} className="animate-spin" /> Loading your application…
          </p>
        )
      )}
    </AuthShell>
  );
}

export function SectionHead({ n, id, title, sub }: { n: number; id: string; title: string; sub: string }) {
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
