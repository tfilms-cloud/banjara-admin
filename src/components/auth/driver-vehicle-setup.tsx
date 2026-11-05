"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Car, Check, LoaderCircle, Minus, Pencil, Plus, Tag } from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useBackendStatus, useQuery } from "@/lib/live-query";
import { DRIVER_STEP_TOTAL, driverStepHref, driverStepNumber } from "@/lib/driver-steps";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  VEHICLE_AMENITIES,
  getDriverVehicleSetup,
  saveVehicleSetup,
} from "@/services/customer/provider-application.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import { PhotoUpload } from "./photo-upload";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";

const STEP = driverStepNumber("vehicle");
const CAPTION = `Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`;
const MAX_SEATS = 60;
const EXTRA_PHOTOS = 3;

const TYPE_LABEL: Record<string, string> = {
  car: "Car",
  jeep: "Jeep",
  suv: "SUV",
  van: "Van",
  mini_bus: "Mini bus",
  bus: "Bus",
};

/** Usual passenger seats for each type, as a starting suggestion. */
const SUGGESTED_SEATS: Record<string, number> = {
  car: 4,
  jeep: 5,
  suv: 6,
  van: 10,
  mini_bus: 14,
  bus: 30,
};

/** Step 6 for local drivers: finish the vehicle travellers will book. */
export function DriverVehicleSetup() {
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
  // Steps 3–5 must be done first; send the driver back to the first one missing.
  const earlierHref =
    data?.progress && ["business", "location", "transport"].includes(data.progress.nextStep)
      ? driverStepHref(data.progress.nextStep)
      : null;
  useEffect(() => {
    if (!application.isSuccess) return;
    if (!data) router.replace("/provider-application");
    else if (!isDriver) router.replace("/provider");
    else if (earlierHref) router.replace(earlierHref);
  }, [application.isSuccess, data, isDriver, earlierHref, router]);

  const setup = useQuery({
    queryKey: ["provider", "vehicle-setup", user?.id],
    queryFn: getDriverVehicleSetup,
    enabled: isDriver && !earlierHref,
    staleTime: Infinity,
  });

  if ((application.isError || setup.isError) && backend !== "checking") {
    return (
      <AuthShell caption={CAPTION} title="Vehicle setup">
        <AuthBanner>
          {(application.error ?? setup.error)?.message ||
            "We couldn’t load your vehicle. Check your connection and refresh the page."}
        </AuthBanner>
      </AuthShell>
    );
  }
  if (loading || !isProvider || backend === "checking" || !data || !isDriver || earlierHref || !setup.data) {
    return (
      <AuthShell caption={CAPTION} title="Vehicle setup">
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Loading your vehicle…
        </p>
      </AuthShell>
    );
  }
  if (!setup.data.vehicle) {
    return (
      <AuthShell caption={CAPTION} title="Vehicle setup">
        <AuthBanner>
          We couldn’t find your vehicle. Save “You &amp; your vehicle” again to create it.
        </AuthBanner>
        <Link href="/provider-application/vehicle" className={styles.primary} style={{ marginTop: 14 }}>
          Go to You &amp; your vehicle <ArrowRight size={16} />
        </Link>
      </AuthShell>
    );
  }
  return <SetupForm userId={user.id} details={setup.data.details} vehicle={setup.data.vehicle} />;
}

function SetupForm({
  userId,
  details,
  vehicle,
}: {
  userId: string;
  details: Record<string, unknown>;
  vehicle: NonNullable<Awaited<ReturnType<typeof getDriverVehicleSetup>>["vehicle"]>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const type = String(details.vehicleClass ?? "");
  const model = String(details.vehicleModel ?? vehicle.vehicleModel);
  const year = String(details.vehicleMakeYear ?? vehicle.year);
  const plate = String(details.registrationNumber ?? vehicle.registrationNumber);
  const savedFront = String(details.vehicleImageFront ?? vehicle.images[0] ?? "");
  const savedBack = String(details.vehicleImageBack ?? vehicle.images[1] ?? "");

  // Name defaults to the model only until the vehicle has been named properly.
  const autoName = /\(.+\)$/.test(vehicle.name) || !vehicle.name;
  const [name, setName] = useState(autoName ? model : vehicle.name);
  const [seats, setSeats] = useState<number | "">(
    vehicle.registrationCompleted && vehicle.seatCount ? vehicle.seatCount : "",
  );
  const [amenities, setAmenities] = useState<string[]>(vehicle.amenities);
  const [front, setFront] = useState(savedFront);
  const [back, setBack] = useState(savedBack);
  const [extra, setExtra] = useState<string[]>(
    vehicle.images.filter((url) => url !== savedFront && url !== savedBack).slice(0, EXTRA_PHOTOS),
  );
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const suggested = SUGGESTED_SEATS[type];

  const trackUpload = (on: boolean) => setUploading((count) => Math.max(0, count + (on ? 1 : -1)));
  const toggleAmenity = (item: string) =>
    setAmenities((list) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]));
  const changeSeats = (delta: number) =>
    setSeats((current) => {
      const base = current === "" ? (suggested ?? 1) - delta : current;
      return Math.min(MAX_SEATS, Math.max(1, base + delta));
    });

  const save = async () => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Give your vehicle a name travellers will recognise";
    if (seats === "" || !Number.isInteger(seats) || seats < 1)
      errors.seats = "Enter how many passengers you can take";
    if (!front) errors.front = "Add a photo of the front of your vehicle";
    if (!back) errors.back = "Add a photo of the back of your vehicle";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Some details are missing. Check the highlighted fields.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveVehicleSetup({
        vehicleId: vehicle.id,
        details,
        name,
        seatCount: Number(seats),
        amenities,
        front,
        back,
        extraPhotos: extra,
      });
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
          : "We couldn’t save your vehicle. Please try again.",
      );
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AuthShell
      wide
      caption={CAPTION}
      title="Vehicle setup"
      step={{ current: STEP, total: DRIVER_STEP_TOTAL }}
      subtitle="This is how travellers will see your vehicle when they book a ride with you."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}

        <div className={v.summary}>
          <span className={v.summaryIcon}>
            <Car size={18} />
          </span>
          <div className={v.summaryText}>
            <small>Your registered vehicle</small>
            <strong>
              {model} · {year}
            </strong>
            <span>
              {TYPE_LABEL[type] ?? "Vehicle"} · {plate}
            </span>
          </div>
          <Link href="/provider-application/vehicle" className={v.summaryEdit}>
            <Pencil size={13} /> Change
          </Link>
        </div>

        <section className={v.section} aria-labelledby="sec-listing">
          <SectionHead n={1} id="sec-listing" title="How travellers see it" sub="Shown on your rides and profile" />
          <AuthField
            label="Vehicle name *"
            icon={Tag}
            value={name}
            maxLength={60}
            placeholder="e.g. White Land Cruiser"
            hint="A short name travellers will recognise at pickup."
            error={fieldErrors.name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className={styles.field}>
            <span className={v.choiceLabel} id="seats-label">
              Passenger seats (not counting you) *
            </span>
            <div className={v.stepper} role="group" aria-labelledby="seats-label">
              <button type="button" onClick={() => changeSeats(-1)} disabled={seats !== "" && seats <= 1} aria-label="One seat fewer">
                <Minus size={16} />
              </button>
              <input
                className={v.stepperValue}
                inputMode="numeric"
                aria-labelledby="seats-label"
                value={seats}
                placeholder={suggested ? String(suggested) : "0"}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "");
                  setSeats(value ? Math.min(MAX_SEATS, Number(value)) : "");
                }}
              />
              <button type="button" onClick={() => changeSeats(1)} disabled={seats !== "" && seats >= MAX_SEATS} aria-label="One seat more">
                <Plus size={16} />
              </button>
            </div>
            {fieldErrors.seats ? (
              <span className={v.fieldError}>{fieldErrors.seats}</span>
            ) : suggested ? (
              <span className={styles.hint}>
                A {TYPE_LABEL[type]?.toLowerCase()} usually takes about {suggested}. Count only seats with a seat belt.
              </span>
            ) : null}
          </div>
          <div className={styles.field}>
            <span className={v.choiceLabel}>Amenities</span>
            <div className={v.chips}>
              {VEHICLE_AMENITIES.map((item) => {
                const on = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    className={`${v.chip} ${on ? v.chipOn : ""}`}
                    onClick={() => toggleAmenity(item)}
                  >
                    {on ? <Check size={14} /> : null}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={v.section} aria-labelledby="sec-gallery">
          <SectionHead n={2} id="sec-gallery" title="Vehicle photos" sub="Front and back from the last step, plus up to 3 more" />
          <div className={v.photos}>
            <PhotoUpload
              label="Front"
              required
              value={front}
              error={fieldErrors.front}
              onBusyChange={trackUpload}
              onChange={setFront}
            />
            <PhotoUpload
              label="Back"
              required
              value={back}
              error={fieldErrors.back}
              onBusyChange={trackUpload}
              onChange={setBack}
            />
            {Array.from({ length: EXTRA_PHOTOS }, (_, index) =>
              index <= extra.length ? (
                <PhotoUpload
                  key={index}
                  label={index === 0 ? "Inside / seats" : `Extra photo ${index + 1}`}
                  hint={index === 0 ? "Show the seats and space" : undefined}
                  value={extra[index]}
                  onBusyChange={trackUpload}
                  onChange={(url) =>
                    setExtra((list) => {
                      const next = [...list];
                      if (url) next[index] = url;
                      else next.splice(index, 1);
                      return next.filter(Boolean);
                    })
                  }
                />
              ) : null,
            )}
          </div>
        </section>

        <button
          type="button"
          className={styles.primary}
          disabled={saving || uploading > 0}
          onClick={() => void save()}
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {saving ? "Saving…" : uploading ? "Waiting for photos to upload…" : "Save and continue"}
          {saving || uploading ? null : <ArrowRight size={16} />}
        </button>
      </div>
    </AuthShell>
  );
}

function SectionHead({ n, id, title, sub }: { n: number; id: string; title: string; sub: string }) {
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
