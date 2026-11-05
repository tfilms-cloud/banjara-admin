import type { DriverStep } from "@/services/customer/auth.service";

/** The local-driver application, in order. `path` is set once a step has a web page. */
export const DRIVER_STEPS: Array<{ key: DriverStep | "account" | "service"; label: string; path?: string }> = [
  { key: "account", label: "Create account" },
  { key: "service", label: "Choose service", path: "/provider-application" },
  { key: "business", label: "Your details", path: "/provider-application" },
  { key: "location", label: "Your location", path: "/provider-application/location" },
  { key: "transport", label: "You & your vehicle", path: "/provider-application/vehicle" },
  { key: "vehicle", label: "Vehicle setup", path: "/provider-application/vehicle-setup" },
  { key: "verification", label: "Verify your CNIC", path: "/provider-application/cnic" },
  { key: "review", label: "Review & submit", path: "/provider-application/review" },
];

export const DRIVER_STEP_TOTAL = DRIVER_STEPS.length;

/** 1-based step number shown in the progress bar. */
export function driverStepNumber(key: (typeof DRIVER_STEPS)[number]["key"]): number {
  return DRIVER_STEPS.findIndex((step) => step.key === key) + 1;
}

/** Web page for a step, or null while that step is only in the app. */
export function driverStepHref(key: DriverStep | undefined): string | null {
  if (!key) return null;
  return DRIVER_STEPS.find((step) => step.key === key)?.path ?? null;
}
