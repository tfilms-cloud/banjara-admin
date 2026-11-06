"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// The site's query hook waits until the backend is confirmed online; the plain one
// races the cache reset that happens when the connection check completes.
import { useBackendStatus, useQuery, useQueryClient } from "@/lib/live-query";
import { z } from "zod";
import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Car,
  Check,
  Compass,
  FileText,
  LoaderCircle,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { getProviderApplication } from "@/services/customer/auth.service";
import { getLodgingProfile } from "@/services/customer/lodging.service";
import {
  listActiveProviderServices,
  startProviderApplication,
  updateDriverDetails,
  type ProviderServiceKey,
} from "@/services/customer/provider-application.service";
import { DRIVER_STEP_TOTAL, LODGING_STEP_TOTAL, nextStepHref } from "@/lib/driver-steps";

/** Services whose whole application is on the website. */
const WEB_STEPS: Partial<Record<string, number>> = { transport: DRIVER_STEP_TOTAL, hotel: LODGING_STEP_TOTAL };
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import styles from "./auth.module.css";

const STORAGE_KEY = "banjara.provider-application.service";

const CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Gilgit",
  "Hunza",
  "Karimabad",
  "Skardu",
  "Naran",
  "Murree",
  "Swat",
  "Chilas",
  "Passu",
  "Fairy Meadows",
  "Nagar",
  "Astore",
  "Khaplu",
];

/** Wording for each service. Transport is offered by individual local drivers. */
const SERVICES: Record<
  ProviderServiceKey,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    /** Individuals list under their own name; businesses add a business name. */
    individual: boolean;
    nameLabel: string;
    aboutLabel: string;
    aboutPlaceholder: string;
    yearsLabel: string;
  }
> = {
  transport: {
    label: "Local driver",
    description: "Drive your own car, jeep or van. Publish rides and seats on routes you know.",
    icon: Car,
    individual: true,
    nameLabel: "Full name (as on your CNIC)",
    aboutLabel: "About you",
    aboutPlaceholder: "Routes you know, languages you speak, what travellers can expect",
    yearsLabel: "Driving experience (years)",
  },
  hotel: {
    label: "Lodging",
    description: "Hotels, guest houses, lodges and hostels. List rooms and manage availability.",
    icon: BedDouble,
    individual: false,
    nameLabel: "Hotel or guest house name",
    aboutLabel: "About your stay",
    aboutPlaceholder: "Rooms, views, facilities and what guests love",
    yearsLabel: "Years in business",
  },
  tour: {
    label: "Tour operator",
    description: "Guided tours, treks and packages with dates and itineraries.",
    icon: MapIcon,
    individual: false,
    nameLabel: "Tour company name",
    aboutLabel: "About your tours",
    aboutPlaceholder: "Destinations, group sizes and what is included",
    yearsLabel: "Years in business",
  },
  travelGuide: {
    label: "Guide",
    description: "Be hired as a local guide for your experience and languages — no trips needed.",
    icon: Compass,
    individual: true,
    nameLabel: "Full name (as on your CNIC)",
    aboutLabel: "About you",
    aboutPlaceholder: "Areas you guide, languages and specialities",
    yearsLabel: "Years guiding",
  },
  restaurant: {
    label: "Restaurant",
    description: "Dining, menus, offers and deals for travellers passing through.",
    icon: Utensils,
    individual: false,
    nameLabel: "Restaurant name",
    aboutLabel: "About your restaurant",
    aboutPlaceholder: "Cuisine, specialities and opening hours",
    yearsLabel: "Years in business",
  },
};

function readStoredService(): ProviderServiceKey | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value && value in SERVICES ? (value as ProviderServiceKey) : null;
  } catch {
    return null;
  }
}

function storeService(value: ProviderServiceKey | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable; the choice still lives in memory */
  }
}

/** Steps 2 and 3 of becoming a provider: choose the service, then the basic details. */
export function ProviderApplication({ editing = false }: { editing?: boolean }) {
  const router = useRouter();
  const { user, loading } = useCustomerAuth();
  const isProvider = user?.role === "provider";
  // Restores the choice after a refresh. The first render is always the loading
  // state below, so reading browser storage here cannot cause a hydration mismatch.
  const [service, setService] = useState<ProviderServiceKey | null>(() =>
    typeof window === "undefined" ? null : readStoredService(),
  );
  const [step, setStep] = useState<"service" | "details">("service");
  // `editing` (from `?edit=details`, the review page's Edit link) opens the details
  // form with the saved values instead of resuming at the next unfinished step.
  const saved = useQuery({
    queryKey: ["provider", "review-for-edit", user?.id],
    queryFn: getLodgingProfile, // the provider profile, whatever the service
    enabled: isProvider && editing,
    staleTime: 0,
  });

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isProvider) router.replace("/account");
  }, [loading, user, isProvider, router]);

  // Where this person stood when they opened the page. A separate, never-refetched
  // snapshot: saving step 3 must not re-trigger this redirect and race the move to step 4.
  const existing = useQuery({
    queryKey: ["provider", "application-on-open", user?.id],
    queryFn: getProviderApplication,
    enabled: isProvider,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  // Already started: carry on at the next unfinished step. Drivers and lodging whose
  // details are still incomplete stay here; other services see their status page.
  const nextHref = existing.data
    ? (nextStepHref(existing.data) ?? "/provider")
    : null;
  const resumeHref = editing || nextHref === "/provider-application" ? null : nextHref;
  const alreadyStarted = Boolean(resumeHref);
  useEffect(() => {
    if (resumeHref) router.replace(resumeHref);
  }, [resumeHref, router]);

  const available = useQuery({
    queryKey: ["provider", "services"],
    queryFn: listActiveProviderServices,
    staleTime: 5 * 60_000,
  });

  const backend = useBackendStatus();
  if (existing.isError && backend !== "checking") {
    return (
      <AuthShell caption="Service provider" title="We couldn’t open your application">
        <AuthBanner>{existing.error.message}</AuthBanner>
      </AuthShell>
    );
  }
  if (loading || !isProvider || backend === "checking" || existing.isPending || alreadyStarted) {
    return (
      <AuthShell caption="Service provider" title="Setting up your application">
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Checking your account…
        </p>
      </AuthShell>
    );
  }

  if (editing) {
    if (saved.isPending) {
      return (
        <AuthShell caption="Your application" title="Your details">
          <p className={styles.note} role="status">
            <LoaderCircle size={15} className="animate-spin" /> Loading your details…
          </p>
        </AuthShell>
      );
    }
    if (saved.isError || !saved.data) {
      return (
        <AuthShell caption="Your application" title="We couldn’t open your details">
          <AuthBanner>{saved.error?.message ?? "Please try again."}</AuthBanner>
        </AuthShell>
      );
    }
    const s = saved.data;
    const editService: ProviderServiceKey = existing.data?.services.includes("hotel") ? "hotel" : "transport";
    return (
      <DetailsStep
        service={editService}
        editing
        initial={{
          businessName: s.businessName,
          ownerName: s.ownerName,
          phone: s.phone,
          email: s.email,
          description: s.description,
          city: s.city,
          address: s.address,
          yearsExperience: String(s.yearsExperience),
        }}
        onBack={() => router.replace("/provider-application/review")}
        onDone={() => router.replace("/provider-application/review")}
      />
    );
  }

  if (step === "details" && service) {
    return (
      <DetailsStep
        service={service}
        onBack={() => setStep("service")}
        onDone={() => {
          storeService(null);
          // Drivers and lodging carry on with their location; other services finish in the app for now.
          router.replace(WEB_STEPS[service] ? "/provider-application/location" : "/provider");
        }}
      />
    );
  }

  const keys = available.data ?? [];
  return (
    <AuthShell
      caption="Service provider · Step 2"
      title="What service do you provide?"
      step={{ current: 2, total: (service && WEB_STEPS[service]) || 3 }}
      subtitle="Choose one. A BANJARA account offers one service, so travellers always know who they are booking."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {available.isPending ? (
          <p className={styles.note} role="status">
            <LoaderCircle size={15} className="animate-spin" /> Loading services…
          </p>
        ) : (
          <div className={styles.services} role="radiogroup" aria-label="Service you provide">
            {keys.map((key) => {
              const option = SERVICES[key];
              const Icon = option.icon;
              const selected = service === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.service} ${selected ? styles.serviceSelected : ""}`}
                  onClick={() => {
                    setService(key);
                    storeService(key);
                  }}
                >
                  <span className={styles.serviceIcon}>
                    <Icon size={20} />
                  </span>
                  <span className={styles.serviceText}>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                  <span className={styles.serviceCheck} aria-hidden="true">
                    {selected ? <Check size={14} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          className={styles.primary}
          disabled={!service}
          onClick={() => setStep("details")}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </AuthShell>
  );
}

const detailsSchema = z.object({
  businessName: z.string().trim(),
  ownerName: z.string().trim().min(2, "Enter your full name"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, "")),
      "Enter a valid phone number (10–15 digits)",
    ),
  email: z.string().trim().email("Enter a valid email"),
  description: z.string().trim().min(10, "Add a short description (at least 10 characters)"),
  city: z.string().trim().min(2, "Enter your city"),
  address: z.string().trim().min(5, "Enter your address"),
  yearsExperience: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter whole years, including 0")
    .refine((value) => Number(value) <= 100, "Enter 0 to 100 years"),
});
type DetailsValues = z.infer<typeof detailsSchema>;

function DetailsStep({
  service,
  onBack,
  onDone,
  editing = false,
  initial,
}: {
  service: ProviderServiceKey;
  onBack: () => void;
  onDone: () => void;
  /** Opened from the review page: prefilled, saves the changes and goes back. */
  editing?: boolean;
  initial?: Partial<DetailsValues>;
}) {
  const { user, refresh } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const option = SERVICES[service];
  // Drivers have the full application on the web; other services finish in the app.
  const total = WEB_STEPS[service] ?? 3;
  const schema = option.individual
    ? detailsSchema
    : detailsSchema.extend({
        businessName: z.string().trim().min(2, `Enter the ${option.nameLabel.toLowerCase()}`),
        ownerName: z.string().trim().min(2, "Enter the owner or manager’s name"),
      });
  const { register, handleSubmit, formState } = useForm<DetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: "",
      ownerName: user?.name ?? "",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
      description: "",
      city: "",
      address: "",
      yearsExperience: "",
      ...initial,
    },
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    if (editing) {
      try {
        await updateDriverDetails({
          businessName: option.individual ? values.ownerName : values.businessName,
          ownerName: values.ownerName,
          phone: values.phone,
          email: values.email,
          description: values.description,
          yearsExperience: Number(values.yearsExperience) || 0,
        });
        // The review page shows these from its cache; make it re-read them.
        await queryClient.invalidateQueries({ queryKey: ["provider"] });
        onDone();
      } catch (reason) {
        setError(reason instanceof Error && reason.message ? reason.message : "We couldn’t save your details.");
      }
      return;
    }
    try {
      await startProviderApplication({
        service,
        // Drivers and guides list under their own name.
        businessName: option.individual ? values.ownerName : values.businessName,
        ownerName: values.ownerName,
        phone: values.phone,
        email: values.email,
        description: values.description,
        city: values.city,
        address: values.address,
        yearsExperience: Number(values.yearsExperience) || 0,
      });
      await refresh();
      onDone();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "We couldn’t save your details. Please try again.",
      );
    }
  });

  return (
    <AuthShell
      caption={`${option.label} · Step 3 of ${total}`}
      title={option.individual ? "Tell us about yourself" : "Tell us about your business"}
      step={{ current: 3, total }}
      subtitle={
        service === "transport"
          ? "Rides on BANJARA are offered by local drivers who drive their own vehicle. Travellers will see your name on your rides."
          : service === "hotel"
            ? "Next you’ll pin your property on the map, then add its details, photos and rooms."
            : "These details appear on your BANJARA profile once you’re approved."
      }
      backHref="/"
      backLabel="Finish later"
      footer={
        editing ? (
          <button type="button" className={styles.link} onClick={onBack}>
            Back to review without saving
          </button>
        ) : (
          <>
            Wrong service?{" "}
            <button type="button" className={styles.link} onClick={onBack}>
              Change it
            </button>
          </>
        )
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error ? <AuthBanner>{error}</AuthBanner> : null}
        {option.individual ? (
          <AuthField
            label={option.nameLabel}
            icon={UserRound}
            autoComplete="name"
            placeholder="e.g. Ayesha Khan"
            error={errors.ownerName?.message}
            {...register("ownerName")}
          />
        ) : (
          <>
            <AuthField
              label={option.nameLabel}
              icon={Building2}
              autoComplete="organization"
              error={errors.businessName?.message}
              {...register("businessName")}
            />
            <AuthField
              label="Owner / manager name"
              icon={UserRound}
              autoComplete="name"
              error={errors.ownerName?.message}
              {...register("ownerName")}
            />
          </>
        )}
        <div className={styles.row2}>
          <AuthField
            label="Phone"
            icon={Phone}
            type="tel"
            autoComplete="tel"
            placeholder="03XX XXXXXXX"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <AuthField
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <AuthField
          label={option.aboutLabel}
          icon={FileText}
          placeholder={option.aboutPlaceholder}
          error={errors.description?.message}
          {...register("description")}
        />
        {editing ? (
          // City and address come from the map pin; they are edited in "Your location".
          <AuthField
            label={option.yearsLabel}
            icon={CalendarClock}
            inputMode="numeric"
            placeholder="0"
            error={errors.yearsExperience?.message}
            {...register("yearsExperience")}
          />
        ) : (
          <>
            <div className={styles.row2}>
              <AuthField
                label="City"
                icon={MapPin}
                list="provider-cities"
                autoComplete="address-level2"
                placeholder={service === "transport" ? "The city you drive from" : "e.g. Hunza"}
                error={errors.city?.message}
                {...register("city")}
              />
              <AuthField
                label={option.yearsLabel}
                icon={CalendarClock}
                inputMode="numeric"
                placeholder="0"
                error={errors.yearsExperience?.message}
                {...register("yearsExperience")}
              />
            </div>
            <datalist id="provider-cities">
              {CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <AuthField
              label="Address"
              icon={service === "transport" ? MapPin : BriefcaseBusiness}
              autoComplete="street-address"
              placeholder="Street, area and city"
              hint="You’ll pin the exact spot on the map in the next step."
              error={errors.address?.message}
              {...register("address")}
            />
          </>
        )}
        <button type="submit" className={styles.primary} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : null}
          {formState.isSubmitting ? "Saving…" : editing ? "Save changes" : "Save and continue"}
          {formState.isSubmitting ? null : <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}
