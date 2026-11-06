"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { lodgingStepHref } from "@/lib/driver-steps";
import { getLodgingProfile, saveHotelDetails, type LodgingProfile } from "@/services/customer/lodging.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner } from "./auth-fields";
import { LodgingGate, SectionHead, lodgingCaption, lodgingStep, useLodgingStep } from "./lodging-shared";
import { PhotoUpload } from "./photo-upload";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";

const TITLE = "Photos";

/** Lodging step 6: the outside, the rooms and (if any) the restaurant. */
export function LodgingPhotos() {
  const { profile, ready, error } = useLodgingStep("photos");
  if (error) return <LodgingGate step="photos" title={TITLE} error={error} />;
  if (!ready || !profile) return <LodgingGate step="photos" title={TITLE} />;
  return <PhotosForm profile={profile} />;
}

const list = (value: unknown) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);

/** A group of photo slots: the filled ones plus one empty slot, up to `max`. */
function PhotoGroup({
  label,
  hint,
  photos,
  max,
  required,
  error,
  onChange,
  onBusy,
}: {
  label: string;
  hint: string;
  photos: string[];
  max: number;
  required: boolean;
  error?: string;
  onChange: (next: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const slots = Math.min(max, photos.length + 1);
  return (
    <>
      <div className={v.photos}>
        {Array.from({ length: slots }, (_, index) => (
          <PhotoUpload
            key={`${index}-${photos[index] ?? "new"}`}
            label={index === 0 ? label : `${label} ${index + 1}`}
            hint={index === 0 ? hint : undefined}
            required={required && index === 0}
            folder="hotels"
            value={photos[index]}
            error={index === 0 ? error : undefined}
            onBusyChange={onBusy}
            onChange={(url) => {
              const next = [...photos];
              if (url) next[index] = url;
              else next.splice(index, 1);
              onChange(next.filter(Boolean));
            }}
          />
        ))}
      </div>
      <p className={styles.hint}>
        {photos.length} of {max} added
      </p>
    </>
  );
}

function PhotosForm({ profile }: { profile: LodgingProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const d = profile.details;
  const hasRestaurant = d.restaurantAvailable === "yes";
  const [outside, setOutside] = useState(list(d.outlookImages));
  const [rooms, setRooms] = useState(list(d.roomImages));
  const [restaurant, setRestaurant] = useState(list(d.restaurantImages));
  const [uploading, setUploading] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = (on: boolean) => setUploading((count) => Math.max(0, count + (on ? 1 : -1)));

  const save = async () => {
    const errors: Record<string, string> = {};
    if (!outside.length) errors.outside = "Add at least one photo of the outside";
    if (!rooms.length) errors.rooms = "Add at least one room photo";
    if (hasRestaurant && !restaurant.length) errors.restaurant = "Add a photo of the restaurant or dining area";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Some photos are missing.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveHotelDetails(
        { outlookImages: outside, roomImages: rooms, restaurantImages: hasRestaurant ? restaurant : [] },
        "photos",
      );
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      const fresh = await getLodgingProfile();
      router.replace(lodgingStepHref(fresh.progress?.nextStep) ?? "/provider");
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "We couldn’t save the photos.");
      setSaving(false);
    }
  };

  return (
    <AuthShell
      wide
      caption={lodgingCaption("photos")}
      title={TITLE}
      step={lodgingStep("photos")}
      subtitle="Bright daylight photos get the most bookings. Each photo uploads as soon as you choose it."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}
        <section className={v.section} aria-labelledby="sec-outside">
          <SectionHead n={1} id="sec-outside" title="Outside" sub="The building, entrance or view travellers will recognise" />
          <PhotoGroup label="Outside" hint="The front of the building" photos={outside} max={4} required error={fieldErrors.outside} onChange={setOutside} onBusy={busy} />
        </section>
        <section className={v.section} aria-labelledby="sec-rooms">
          <SectionHead n={2} id="sec-rooms" title="Rooms" sub="Beds, bathrooms and the view from the window" />
          <PhotoGroup label="Room" hint="A made-up bed in good light" photos={rooms} max={6} required error={fieldErrors.rooms} onChange={setRooms} onBusy={busy} />
        </section>
        {hasRestaurant ? (
          <section className={v.section} aria-labelledby="sec-restaurant">
            <SectionHead n={3} id="sec-restaurant" title="Restaurant" sub="Where guests eat" />
            <PhotoGroup label="Restaurant" hint="The dining area" photos={restaurant} max={3} required error={fieldErrors.restaurant} onChange={setRestaurant} onBusy={busy} />
          </section>
        ) : (
          <p className={styles.hint}>
            No restaurant photos needed: you said guests can’t eat at the property.{" "}
            <Link href="/provider-application/property">Change</Link>
          </p>
        )}
        <button type="button" className={styles.primary} disabled={saving || uploading > 0} onClick={() => void save()}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {uploading > 0 ? "Uploading…" : saving ? "Saving…" : "Save and continue"}
          {saving || uploading > 0 ? null : <ArrowRight size={16} />}
        </button>
      </div>
    </AuthShell>
  );
}
