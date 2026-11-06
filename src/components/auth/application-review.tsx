"use client";

import { LoaderCircle } from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import { AuthShell } from "./auth-shell";
import { DriverReview } from "./driver-review";
import { LodgingReview } from "./lodging-review";
import styles from "./auth.module.css";

/** Review & submit: the driver or the lodging version, depending on the application. */
export function ApplicationReview() {
  const { user } = useCustomerAuth();
  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: user?.role === "provider",
  });
  if (application.data?.services.includes("hotel")) return <LodgingReview />;
  if (application.data || application.isError || (user && user.role !== "provider")) return <DriverReview />;
  return (
    <AuthShell caption="Your application" title="Review & submit">
      <p className={styles.note} role="status">
        <LoaderCircle size={15} className="animate-spin" /> Loading your application…
      </p>
    </AuthShell>
  );
}
