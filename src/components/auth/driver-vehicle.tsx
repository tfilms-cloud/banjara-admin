"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Car,
  CreditCard,
  FileText,
  Hash,
  IdCard,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { DRIVER_STEP_TOTAL, driverStepHref, driverStepNumber } from "@/lib/driver-steps";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  getMyDriverProfile,
  saveDriverVehicle,
  type DriverVehicleDetails,
} from "@/services/customer/provider-application.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import { PhotoUpload } from "./photo-upload";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";

const STEP = driverStepNumber("transport");
const THIS_YEAR = new Date().getFullYear();

const VEHICLE_TYPES = [
  { value: "car", label: "Car" },
  { value: "jeep", label: "Jeep" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "mini_bus", label: "Mini bus" },
  { value: "bus", label: "Bus" },
] as const;

/** Same insurer list as the app. */
const INSURERS = [
  { value: "jubilee", label: "Jubilee General Insurance" },
  { value: "efu", label: "EFU General Insurance" },
  { value: "adamjee", label: "Adamjee Insurance" },
  { value: "ubl_insurer", label: "UBL Insurers" },
  { value: "askari", label: "Askari General Insurance" },
  { value: "igi", label: "IGI Insurance" },
  { value: "takaful_pakistan", label: "Takaful Pakistan" },
  { value: "salaam_takaful", label: "Salaam Takaful" },
  { value: "other", label: "Other" },
];

const PRICING = [
  { value: "per_seat", label: "Per seat", sub: "Each traveller pays for their seat" },
  { value: "per_vehicle", label: "Per vehicle", sub: "One fare for hiring the whole vehicle" },
  { value: "negotiable", label: "Negotiable", sub: "You quote after a traveller asks" },
] as const;

const digits = (value: string) => value.replace(/\D/g, "");
const isPhone = (value: string) => /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, ""));
const isYear = (value: string) =>
  /^\d{4}$/.test(value.trim()) && Number(value) >= 1980 && Number(value) <= THIS_YEAR + 1;

/** Formats as 12345-1234567-1 while typing. */
function formatCnic(value: string) {
  const d = digits(value).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/* Mirrors the backend checks in utils/transportValidation.ts. */
const schema = z
  .object({
    vehicleClass: z.enum(["car", "jeep", "suv", "van", "mini_bus", "bus"], {
      message: "Choose your vehicle type",
    }),
    vehicleModel: z.string().trim().min(2, "Enter the vehicle model, e.g. Toyota Corolla"),
    vehicleMakeYear: z.string().refine(isYear, `Enter a year from 1980 to ${THIS_YEAR + 1}`),
    registrationNumber: z.string().trim().min(3, "Enter the registration number"),
    engineNumber: z.string().trim().min(3, "Enter the engine number"),
    ownerName: z.string().trim().min(2, "Enter the name on the registration book"),
    driverName: z.string().trim().min(2, "Enter your full name"),
    driverPhone: z.string().refine(isPhone, "Enter a valid phone number (10–15 digits)"),
    driverEmail: z
      .string()
      .trim()
      .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email"),
    driverCnic: z.string().refine((value) => digits(value).length === 13, "Your CNIC must have 13 digits"),
    driverLicenseNumber: z.string().trim().min(3, "Enter your driving licence number"),
    driverPermanentAddress: z.string().trim().min(5, "Enter your permanent address"),
    driverEmergencyContact: z.string().refine(isPhone, "Enter a valid emergency contact (10–15 digits)"),
    driverExperienceYears: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value) && Number(value) <= 80, "Enter whole years from 0 to 80"),
    hasInsurance: z.enum(["yes", "no"], { message: "Tell us if your vehicle is insured" }),
    insuranceCompany: z.string(),
    insuranceNumber: z.string().trim(),
    insuranceYear: z.string(),
    vehicleImageFront: z.string().min(1, "Add a photo of the front of your vehicle"),
    vehicleImageBack: z.string().min(1, "Add a photo of the back of your vehicle"),
    driverPhoto: z.string(),
    routes: z.array(z.object({ from: z.string(), to: z.string() })),
    operatingCities: z.string(),
    description: z.string(),
    pricingMethod: z.enum(["per_seat", "per_vehicle", "negotiable"], {
      message: "Choose how you charge",
    }),
    priceAmount: z.string(),
    pricePercent: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.hasInsurance === "no") {
      ctx.addIssue({
        code: "custom",
        path: ["hasInsurance"],
        message: "Valid car insurance is required. Drivers without insurance can’t be approved.",
      });
    }
    if (value.hasInsurance === "yes") {
      if (!value.insuranceCompany)
        ctx.addIssue({ code: "custom", path: ["insuranceCompany"], message: "Choose your insurer" });
      if (value.insuranceNumber.length < 3)
        ctx.addIssue({ code: "custom", path: ["insuranceNumber"], message: "Enter the policy number" });
      if (!isYear(value.insuranceYear))
        ctx.addIssue({ code: "custom", path: ["insuranceYear"], message: "Enter the insurance year" });
    }
    if (value.pricingMethod !== "negotiable") {
      const amount = Number(value.priceAmount);
      if (!Number.isFinite(amount) || amount <= 0)
        ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "Enter your fare in rupees" });
    }
    if (value.pricePercent.trim()) {
      const percent = Number(value.pricePercent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100)
        ctx.addIssue({ code: "custom", path: ["pricePercent"], message: "Enter 0 to 100" });
    }
    value.routes.forEach((route, index) => {
      const from = route.from.trim();
      const to = route.to.trim();
      if (from && !to)
        ctx.addIssue({ code: "custom", path: ["routes", index, "to"], message: "Add where this route ends" });
      if (to && !from)
        ctx.addIssue({ code: "custom", path: ["routes", index, "from"], message: "Add where this route starts" });
    });
  }, {
    // Run these cross-field checks even while other fields are still empty,
    // so every problem shows on the first "Save".
    when: () => true,
  });

type Values = z.infer<typeof schema>;
type Prefill = Awaited<ReturnType<typeof getMyDriverProfile>>;

const draftKey = (userId: string) => `banjara.driver-vehicle.${userId}`;
function readDraft(userId: string): Partial<Values> | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? (JSON.parse(raw) as Partial<Values>) : null;
  } catch {
    return null;
  }
}
function writeDraft(userId: string, values: Partial<Values> | null) {
  try {
    if (values) localStorage.setItem(draftKey(userId), JSON.stringify(values));
    else localStorage.removeItem(draftKey(userId));
  } catch {
    /* drafts are a convenience only */
  }
}

/** Turns "Islamabad → Hunza" back into a from/to pair. */
function parseRoute(raw: string) {
  const parts = raw.split(/\s*(?:→|->| to )\s*/i).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? { from: parts[0], to: parts[parts.length - 1] } : null;
}

function defaultsFrom(prefill: Prefill): Values {
  const t = prefill.transport;
  const text = (value: unknown) => (value == null ? "" : String(value));
  const routes = (Array.isArray(t.operatingRoutes) ? t.operatingRoutes : [])
    .map((route) => parseRoute(String(route)))
    .filter((route): route is { from: string; to: string } => Boolean(route));
  const vehicleClass = VEHICLE_TYPES.some((type) => type.value === t.vehicleClass)
    ? (t.vehicleClass as Values["vehicleClass"])
    : (undefined as unknown as Values["vehicleClass"]);
  return {
    vehicleClass,
    vehicleModel: text(t.vehicleModel),
    vehicleMakeYear: text(t.vehicleMakeYear),
    registrationNumber: text(t.registrationNumber),
    engineNumber: text(t.engineNumber),
    ownerName: text(t.ownerName) || prefill.ownerName,
    driverName: text(t.driverName) || prefill.ownerName,
    driverPhone: text(t.driverPhone) || prefill.phone,
    driverEmail: text(t.driverEmail) || prefill.email,
    driverCnic: formatCnic(text(t.driverCnic)),
    driverLicenseNumber: text(t.driverLicenseNumber),
    driverPermanentAddress: text(t.driverPermanentAddress),
    driverEmergencyContact: text(t.driverEmergencyContact),
    driverExperienceYears: text(t.driverExperienceYears) || String(prefill.yearsExperience || ""),
    hasInsurance: (t.hasInsurance === "yes" || t.hasInsurance === "no"
      ? t.hasInsurance
      : undefined) as unknown as Values["hasInsurance"],
    insuranceCompany: text(t.insuranceCompany),
    insuranceNumber: text(t.insuranceNumber),
    insuranceYear: text(t.insuranceYear),
    vehicleImageFront: text(t.vehicleImageFront),
    vehicleImageBack: text(t.vehicleImageBack),
    driverPhoto: text(t.driverPhoto),
    routes: routes.length ? routes : [{ from: prefill.city || "", to: "" }],
    operatingCities: (Array.isArray(t.operatingCities) ? t.operatingCities : [prefill.city])
      .filter(Boolean)
      .join(", "),
    description: text(t.description),
    pricingMethod: (["per_seat", "per_vehicle", "negotiable"].includes(text(t.pricingMethod))
      ? t.pricingMethod
      : "per_seat") as Values["pricingMethod"],
    priceAmount: t.priceAmount ? String(t.priceAmount) : "",
    pricePercent: t.pricePercent != null ? String(t.pricePercent) : "",
  };
}

/** Step 5 for local drivers: the vehicle they drive, their documents, insurance, photos and fares. */
export function DriverVehicle() {
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
  // Earlier steps come first; a driver who hasn't pinned a location goes back there.
  const earlierHref =
    data?.progress && ["business", "location"].includes(data.progress.nextStep)
      ? driverStepHref(data.progress.nextStep)
      : null;
  useEffect(() => {
    if (!application.isSuccess) return;
    if (!data) router.replace("/provider-application");
    else if (!isDriver) router.replace("/provider");
    else if (earlierHref) router.replace(earlierHref);
  }, [application.isSuccess, data, isDriver, earlierHref, router]);

  const prefill = useQuery({
    queryKey: ["provider", "driver-profile", user?.id],
    queryFn: getMyDriverProfile,
    enabled: isDriver && !earlierHref,
    staleTime: Infinity,
  });

  const caption = `Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`;
  if ((application.isError || prefill.isError) && backend !== "checking") {
    return (
      <AuthShell caption={caption} title="You & your vehicle">
        <AuthBanner>
          {(application.error ?? prefill.error)?.message ||
            "We couldn’t load your application. Check your connection and refresh the page."}
        </AuthBanner>
      </AuthShell>
    );
  }
  if (loading || !isProvider || backend === "checking" || !data || !isDriver || earlierHref || !prefill.data) {
    return (
      <AuthShell caption={caption} title="You & your vehicle">
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Loading your application…
        </p>
      </AuthShell>
    );
  }
  return <VehicleForm userId={user.id} prefill={prefill.data} />;
}

function VehicleForm({ userId, prefill }: { userId: string; prefill: Prefill }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(0);
  // A saved draft (from a refresh) wins over what's on the server, which may be older.
  const defaults = useMemo(() => ({ ...defaultsFrom(prefill), ...(readDraft(userId) ?? {}) }), [prefill, userId]);
  const { register, handleSubmit, formState, watch, setValue, control } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const routes = useFieldArray({ control, name: "routes" });
  const errors = formState.errors;
  const values = watch();

  // Keep a draft on this device so a refresh doesn't lose a long form.
  const snapshot = JSON.stringify(values);
  useEffect(() => {
    writeDraft(userId, JSON.parse(snapshot) as Partial<Values>);
  }, [snapshot, userId]);

  const onSubmit = handleSubmit(async (form) => {
    setError("");
    const operatingRoutes = form.routes
      .map((route) => ({ from: route.from.trim(), to: route.to.trim() }))
      .filter((route) => route.from && route.to)
      .map((route) => `${route.from} → ${route.to}`);
    const cities = form.operatingCities
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean);
    const details: DriverVehicleDetails = {
      vehicleClass: form.vehicleClass,
      vehicleModel: form.vehicleModel.trim(),
      vehicleMakeYear: form.vehicleMakeYear.trim(),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      engineNumber: form.engineNumber.trim().toUpperCase(),
      ownerName: form.ownerName.trim(),
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      driverEmail: form.driverEmail.trim() || undefined,
      driverCnic: form.driverCnic.trim(),
      driverLicenseNumber: form.driverLicenseNumber.trim().toUpperCase(),
      driverPermanentAddress: form.driverPermanentAddress.trim(),
      driverEmergencyContact: form.driverEmergencyContact.trim(),
      driverExperienceYears: form.driverExperienceYears.trim(),
      hasInsurance: "yes",
      insuranceCompany: form.insuranceCompany,
      insuranceNumber: form.insuranceNumber.trim(),
      insuranceYear: form.insuranceYear.trim(),
      vehicleImageFront: form.vehicleImageFront,
      vehicleImageBack: form.vehicleImageBack,
      driverPhoto: form.driverPhoto || undefined,
      operatingCities: cities,
      operatingRoutes,
      description: form.description.trim() || undefined,
      pricingMethod: form.pricingMethod,
      priceAmount: form.pricingMethod === "negotiable" ? undefined : Number(form.priceAmount),
      pricePercent: form.pricePercent.trim() ? Number(form.pricePercent) : undefined,
    };
    try {
      await saveDriverVehicle(details);
      writeDraft(userId, null);
      const fresh = await queryClient.fetchQuery({
        queryKey: ["provider", "application", userId],
        queryFn: getProviderApplication,
        // Always ask the server: the step just saved changed what comes next.
        staleTime: 0,
      });
      router.replace(driverStepHref(fresh?.progress?.nextStep) ?? "/provider");
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "We couldn’t save your details. Please try again.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, () => {
    setError("Some details are missing or need a fix. Check the highlighted fields.");
  });

  const busy = formState.isSubmitting || uploading > 0;
  const trackUpload = (on: boolean) => setUploading((count) => Math.max(0, count + (on ? 1 : -1)));

  return (
    <AuthShell
      wide
      caption={`Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`}
      title="You & your vehicle"
      step={{ current: STEP, total: DRIVER_STEP_TOTAL }}
      subtitle="You drive your own vehicle on every ride, so register the one vehicle you drive. Fields marked * are needed for verification."
      backHref="/"
      backLabel="Finish later"
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error ? <AuthBanner>{error}</AuthBanner> : null}

        {/* 1. Vehicle */}
        <section className={v.section} aria-labelledby="sec-vehicle">
          <Head n={1} id="sec-vehicle" title="Your vehicle" sub="As written in the registration book" />
          <Choice
            label="Vehicle type *"
            error={errors.vehicleClass?.message}
            options={VEHICLE_TYPES}
            value={values.vehicleClass}
            onChange={(value) => setValue("vehicleClass", value as Values["vehicleClass"], { shouldValidate: true })}
          />
          <div className={styles.row2}>
            <AuthField label="Model *" icon={Car} placeholder="e.g. Toyota Corolla" error={errors.vehicleModel?.message} {...register("vehicleModel")} />
            <AuthField label="Make year *" icon={CalendarClock} inputMode="numeric" maxLength={4} placeholder={String(THIS_YEAR - 4)} error={errors.vehicleMakeYear?.message} {...register("vehicleMakeYear")} />
          </div>
          <div className={styles.row2}>
            <AuthField label="Registration number *" icon={Hash} placeholder="e.g. GLT-1234" autoCapitalize="characters" error={errors.registrationNumber?.message} {...register("registrationNumber")} />
            <AuthField label="Engine number *" icon={Hash} autoCapitalize="characters" error={errors.engineNumber?.message} {...register("engineNumber")} />
          </div>
          <AuthField label="Registered in the name of *" icon={UserRound} hint="Usually you. It can be a family member if the vehicle is registered to them." error={errors.ownerName?.message} {...register("ownerName")} />
        </section>

        {/* 2. Driver */}
        <section className={v.section} aria-labelledby="sec-you">
          <Head n={2} id="sec-you" title="About you" sub="You are the driver on every ride" />
          <AuthField label="Your name *" icon={UserRound} autoComplete="name" error={errors.driverName?.message} {...register("driverName")} />
          <div className={styles.row2}>
            <AuthField label="Phone *" icon={Phone} type="tel" autoComplete="tel" error={errors.driverPhone?.message} {...register("driverPhone")} />
            <AuthField label="Email (optional)" icon={Mail} type="email" autoComplete="email" error={errors.driverEmail?.message} {...register("driverEmail")} />
          </div>
          <div className={styles.row2}>
            <AuthField
              label="CNIC *"
              icon={IdCard}
              inputMode="numeric"
              placeholder="12345-1234567-1"
              error={errors.driverCnic?.message}
              {...withFormat(register("driverCnic"), (value) => setValue("driverCnic", formatCnic(value)))}
            />
            <AuthField label="Driving licence number *" icon={CreditCard} autoCapitalize="characters" error={errors.driverLicenseNumber?.message} {...register("driverLicenseNumber")} />
          </div>
          <AuthField label="Permanent address *" icon={MapPin} autoComplete="street-address" error={errors.driverPermanentAddress?.message} {...register("driverPermanentAddress")} />
          <div className={styles.row2}>
            <AuthField label="Emergency contact *" icon={PhoneCall} type="tel" placeholder="A family member’s number" error={errors.driverEmergencyContact?.message} {...register("driverEmergencyContact")} />
            <AuthField label="Driving experience (years) *" icon={CalendarClock} inputMode="numeric" error={errors.driverExperienceYears?.message} {...register("driverExperienceYears")} />
          </div>
        </section>

        {/* 3. Insurance */}
        <section className={v.section} aria-labelledby="sec-insurance">
          <Head n={3} id="sec-insurance" title="Car insurance" sub="Insurance is required to drive with BANJARA" />
          <Choice
            label="Is your vehicle insured? *"
            error={errors.hasInsurance?.message}
            options={[
              { value: "yes", label: "Yes, it’s insured" },
              { value: "no", label: "No" },
            ]}
            value={values.hasInsurance}
            onChange={(value) => setValue("hasInsurance", value as Values["hasInsurance"], { shouldValidate: true })}
          />
          {values.hasInsurance === "yes" ? (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="insurer">
                  Insurance company *
                </label>
                <select
                  id="insurer"
                  className={`${v.select} ${errors.insuranceCompany ? v.selectError : ""}`}
                  {...register("insuranceCompany")}
                >
                  <option value="">Choose your insurer</option>
                  {INSURERS.map((insurer) => (
                    <option key={insurer.value} value={insurer.value}>
                      {insurer.label}
                    </option>
                  ))}
                </select>
                {errors.insuranceCompany ? <span className={v.fieldError}>{errors.insuranceCompany.message}</span> : null}
              </div>
              <div className={styles.row2}>
                <AuthField label="Policy number *" icon={ShieldCheck} error={errors.insuranceNumber?.message} {...register("insuranceNumber")} />
                <AuthField label="Insurance year *" icon={CalendarClock} inputMode="numeric" maxLength={4} placeholder={String(THIS_YEAR)} error={errors.insuranceYear?.message} {...register("insuranceYear")} />
              </div>
            </>
          ) : null}
        </section>

        {/* 4. Photos */}
        <section className={v.section} aria-labelledby="sec-photos">
          <Head n={4} id="sec-photos" title="Photos" sub="Clear daylight photos help us verify you faster" />
          <div className={v.photos}>
            <PhotoUpload
              label="Vehicle — front"
              required
              hint="Number plate visible"
              value={values.vehicleImageFront}
              error={errors.vehicleImageFront?.message}
              onBusyChange={trackUpload}
              onChange={(url) => setValue("vehicleImageFront", url, { shouldValidate: true })}
            />
            <PhotoUpload
              label="Vehicle — back"
              required
              hint="Number plate visible"
              value={values.vehicleImageBack}
              error={errors.vehicleImageBack?.message}
              onBusyChange={trackUpload}
              onChange={(url) => setValue("vehicleImageBack", url, { shouldValidate: true })}
            />
            <PhotoUpload
              label="Your photo"
              hint="Travellers see this on your profile"
              value={values.driverPhoto}
              onBusyChange={trackUpload}
              onChange={(url) => setValue("driverPhoto", url)}
            />
          </div>
        </section>

        {/* 5. Routes & fares */}
        <section className={v.section} aria-labelledby="sec-routes">
          <Head n={5} id="sec-routes" title="Routes & fares" sub="Where you drive and how you charge" />
          <div className={styles.field}>
            <span className={v.choiceLabel}>Routes you drive</span>
            <div className={v.routes}>
              {routes.fields.map((field, index) => (
                <div key={field.id}>
                  <div className={v.route}>
                    <input className={v.routeInput} placeholder="From, e.g. Islamabad" aria-label={`Route ${index + 1} from`} {...register(`routes.${index}.from`)} />
                    <ArrowRight size={15} className={v.routeArrow} aria-hidden="true" />
                    <input className={v.routeInput} placeholder="To, e.g. Hunza" aria-label={`Route ${index + 1} to`} {...register(`routes.${index}.to`)} />
                    <button type="button" className={v.iconButton} onClick={() => routes.remove(index)} aria-label={`Remove route ${index + 1}`}>
                      <X size={16} />
                    </button>
                  </div>
                  {errors.routes?.[index]?.from || errors.routes?.[index]?.to ? (
                    <span className={v.fieldError}>
                      {errors.routes[index]?.from?.message ?? errors.routes[index]?.to?.message}
                    </span>
                  ) : null}
                </div>
              ))}
              <button type="button" className={v.addRoute} onClick={() => routes.append({ from: "", to: "" })}>
                <Plus size={15} /> Add a route
              </button>
            </div>
          </div>
          <AuthField label="Cities you serve" icon={MapPin} placeholder="e.g. Hunza, Gilgit, Islamabad" hint="Separate cities with commas." {...register("operatingCities")} />
          <div className={styles.field}>
            <span className={v.choiceLabel}>How do you charge? *</span>
            <div className={v.options} role="radiogroup" aria-label="Pricing method">
              {PRICING.map((option) => {
                const on = values.pricingMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`${v.option} ${on ? v.optionOn : ""}`}
                    onClick={() => setValue("pricingMethod", option.value, { shouldValidate: true })}
                  >
                    <span className={v.radio} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      <span>{option.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.pricingMethod ? <span className={v.fieldError}>{errors.pricingMethod.message}</span> : null}
          </div>
          <div className={styles.row2}>
            {values.pricingMethod !== "negotiable" ? (
              <AuthField
                label={values.pricingMethod === "per_vehicle" ? "Fare for the vehicle (Rs) *" : "Fare per seat (Rs) *"}
                icon={Wallet}
                inputMode="numeric"
                placeholder={values.pricingMethod === "per_vehicle" ? "e.g. 25000" : "e.g. 4500"}
                error={errors.priceAmount?.message}
                {...register("priceAmount")}
              />
            ) : null}
            <AuthField
              label="Advance payment % (optional)"
              icon={BadgeCheck}
              inputMode="numeric"
              placeholder="e.g. 20"
              hint="Paid when a traveller books."
              error={errors.pricePercent?.message}
              {...register("pricePercent")}
            />
          </div>
          <AuthField
            label="About your service (optional)"
            icon={FileText}
            placeholder="AC, luggage space, stops on the way…"
            {...register("description")}
          />
        </section>

        <p className={v.draftNote}>
          <BadgeCheck size={13} /> Your answers are kept on this device until you save.
        </p>
        <button type="submit" className={styles.primary} disabled={busy}>
          {formState.isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {formState.isSubmitting
            ? "Saving…"
            : uploading
              ? "Waiting for photos to upload…"
              : "Save and continue"}
          {busy ? null : <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
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

function Choice({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className={styles.field}>
      <span className={v.choiceLabel}>{label}</span>
      <div className={v.chips} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const on = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              className={`${v.chip} ${on ? v.chipOn : ""}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <span className={v.fieldError}>{error}</span> : null}
    </div>
  );
}

/** Keeps react-hook-form's handlers but reformats the value as the driver types. */
function withFormat(registration: UseFormRegisterReturn, format: (value: string) => void): UseFormRegisterReturn {
  return {
    ...registration,
    onChange: async (event) => {
      await registration.onChange(event);
      format(String((event.target as HTMLInputElement).value ?? ""));
    },
  };
}
