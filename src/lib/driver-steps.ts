import type { DriverStep, LodgingStep } from "@/services/customer/auth.service";

type StepDef<K extends string> = { key: K | "account" | "service"; label: string; path?: string };

/** The local-driver application, in order. `path` is set once a step has a web page. */
export const DRIVER_STEPS: Array<StepDef<DriverStep>> = [
  { key: "account", label: "Create account" },
  { key: "service", label: "Choose service", path: "/provider-application" },
  { key: "business", label: "Your details", path: "/provider-application" },
  { key: "location", label: "Your location", path: "/provider-application/location" },
  { key: "transport", label: "You & your vehicle", path: "/provider-application/vehicle" },
  { key: "vehicle", label: "Vehicle setup", path: "/provider-application/vehicle-setup" },
  { key: "verification", label: "Verify your CNIC", path: "/provider-application/cnic" },
  { key: "review", label: "Review & submit", path: "/provider-application/review" },
];

/** The lodging (hotel, guest house, lodge, hostel) application, in order. */
export const LODGING_STEPS: Array<StepDef<LodgingStep>> = [
  { key: "account", label: "Create account" },
  { key: "service", label: "Choose service", path: "/provider-application" },
  { key: "business", label: "Your details", path: "/provider-application" },
  { key: "location", label: "Property location", path: "/provider-application/location" },
  { key: "property", label: "Property details", path: "/provider-application/property" },
  { key: "photos", label: "Photos", path: "/provider-application/photos" },
  { key: "rooms", label: "Rooms", path: "/provider-application/rooms" },
  { key: "review", label: "Review & submit", path: "/provider-application/review" },
];

export const DRIVER_STEP_TOTAL = DRIVER_STEPS.length;
export const LODGING_STEP_TOTAL = LODGING_STEPS.length;

/** 1-based step number shown in the progress bar. */
export function driverStepNumber(key: (typeof DRIVER_STEPS)[number]["key"]): number {
  return DRIVER_STEPS.findIndex((step) => step.key === key) + 1;
}

export function lodgingStepNumber(key: (typeof LODGING_STEPS)[number]["key"]): number {
  return LODGING_STEPS.findIndex((step) => step.key === key) + 1;
}

/** Web page for a step, or null while that step is only in the app. */
export function driverStepHref(key: string | undefined): string | null {
  if (!key) return null;
  return DRIVER_STEPS.find((step) => step.key === key)?.path ?? null;
}

export function lodgingStepHref(key: string | undefined): string | null {
  if (!key) return null;
  return LODGING_STEPS.find((step) => step.key === key)?.path ?? null;
}

/** The steps for whichever service this application is for (null: not on the web). */
export function applicationSteps(services: string[] | undefined) {
  if (services?.includes("transport")) return DRIVER_STEPS as Array<StepDef<string>>;
  if (services?.includes("hotel")) return LODGING_STEPS as Array<StepDef<string>>;
  return null;
}

/** Page for an application's next step, whatever its service. */
export function nextStepHref(application: { services: string[]; progress?: { nextStep: string } } | null | undefined) {
  if (!application?.progress) return null;
  const steps = applicationSteps(application.services);
  return steps?.find((step) => step.key === application.progress!.nextStep)?.path ?? null;
}
