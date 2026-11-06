"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  Clock3,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { lodgingStepHref } from "@/lib/driver-steps";
import {
  LODGING_TYPES,
  PROPERTY_AMENITIES,
  getLodgingProfile,
  saveHotelDetails,
  type LodgingProfile,
} from "@/services/customer/lodging.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import { LodgingGate, SectionHead, lodgingCaption, lodgingStep, useLodgingStep } from "./lodging-shared";
import styles from "./auth.module.css";
import v from "./vehicle.module.css";

const TITLE = "Property details";

/** Lodging step 5: what kind of place it is, who runs it, and how stays work. */
export function LodgingProperty() {
  const { user, profile, ready, error } = useLodgingStep("property");
  if (error) return <LodgingGate step="property" title={TITLE} error={error} />;
  if (!ready || !profile || !user) return <LodgingGate step="property" title={TITLE} />;
  return <PropertyForm profile={profile} />;
}

type Values = {
  hotelName: string;
  hotelType: string;
  managerName: string;
  phone: string;
  landline: string;
  email: string;
  village: string;
  district: string;
  city: string;
  address: string;
  businessRegistrationNumber: string;
  yearsExperience: string;
  checkInTime: string;
  checkOutTime: string;
  restaurantAvailable: string;
  amenities: string[];
  description: string;
  website: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTiktok: string;
};

function initialValues(p: LodgingProfile): Values {
  const d = p.details;
  const s = (value: unknown, fallback = "") => (typeof value === "string" && value ? value : fallback);
  return {
    hotelName: s(d.hotelName, p.businessName),
    hotelType: s(d.hotelType),
    managerName: s(d.managerName, p.ownerName),
    phone: s(d.phone, p.phone),
    landline: s(d.landline),
    email: s(d.email, p.email),
    village: s(d.village),
    district: s(d.district),
    city: s(d.city, p.city),
    address: s(d.address, p.address),
    businessRegistrationNumber: s(d.businessRegistrationNumber),
    yearsExperience: d.yearsExperience != null ? String(d.yearsExperience) : String(p.yearsExperience ?? ""),
    checkInTime: s(d.checkInTime, "14:00"),
    checkOutTime: s(d.checkOutTime, "12:00"),
    restaurantAvailable: s(d.restaurantAvailable),
    amenities: Array.isArray(d.amenities) ? d.amenities.map(String) : [],
    description: s(d.description, p.description),
    website: s(d.website),
    socialFacebook: s(d.socialFacebook),
    socialInstagram: s(d.socialInstagram),
    socialTiktok: s(d.socialTiktok),
  };
}

const PHONE = /^\+?\d{10,15}$/;

function validate(x: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (x.hotelName.trim().length < 2) e.hotelName = "Enter the property’s name";
  if (!x.hotelType) e.hotelType = "Choose the type of lodging";
  if (x.managerName.trim().length < 2) e.managerName = "Enter the manager’s name";
  if (!PHONE.test(x.phone.replace(/[\s()-]/g, ""))) e.phone = "Enter a valid mobile number";
  if (x.village.trim().length < 2) e.village = "Enter the village or area";
  if (x.district.trim().length < 2) e.district = "Enter the district";
  if (x.city.trim().length < 2) e.city = "Enter the city";
  if (x.address.trim().length < 3) e.address = "Enter the address";
  if (x.businessRegistrationNumber.trim().length < 3) e.businessRegistrationNumber = "Enter the registration number";
  const years = Number(x.yearsExperience);
  if (x.yearsExperience === "" || !Number.isInteger(years) || years < 0 || years > 100)
    e.yearsExperience = "Enter whole years (0 if you are new)";
  if (!/^\d{2}:\d{2}$/.test(x.checkInTime)) e.checkInTime = "Set a check-in time";
  if (!/^\d{2}:\d{2}$/.test(x.checkOutTime)) e.checkOutTime = "Set a check-out time";
  if (!x.restaurantAvailable) e.restaurantAvailable = "Say whether guests can eat at the property";
  return e;
}

function PropertyForm({ profile }: { profile: LodgingProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [x, setX] = useState<Values>(() => initialValues(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setX((current) => ({ ...current, [key]: value }));
  const field = (key: keyof Values) => ({
    value: x[key] as string,
    error: fieldErrors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value as never),
  });
  const toggleAmenity = (item: string) =>
    set("amenities", x.amenities.includes(item) ? x.amenities.filter((a) => a !== item) : [...x.amenities, item]);

  const save = async () => {
    const errors = validate(x);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Some details are missing. Check the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveHotelDetails(
        {
          hotelName: x.hotelName.trim(),
          hotelType: x.hotelType,
          managerName: x.managerName.trim(),
          phone: x.phone.trim(),
          landline: x.landline.trim() || undefined,
          email: x.email.trim().toLowerCase(),
          village: x.village.trim(),
          district: x.district.trim(),
          city: x.city.trim(),
          address: x.address.trim(),
          latitude: profile.location?.latitude,
          longitude: profile.location?.longitude,
          businessRegistered: "yes",
          businessRegistrationNumber: x.businessRegistrationNumber.trim(),
          yearsExperience: Number(x.yearsExperience),
          checkInTime: x.checkInTime,
          checkOutTime: x.checkOutTime,
          restaurantAvailable: x.restaurantAvailable as "yes" | "no",
          amenities: x.amenities,
          description: x.description.trim(),
          website: x.website.trim() || undefined,
          socialFacebook: x.socialFacebook.trim() || undefined,
          socialInstagram: x.socialInstagram.trim() || undefined,
          socialTiktok: x.socialTiktok.trim() || undefined,
        },
        "property",
      );
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      const fresh = await getLodgingProfile();
      router.replace(lodgingStepHref(fresh.progress?.nextStep) ?? "/provider");
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "We couldn’t save the property details.");
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AuthShell
      wide
      caption={lodgingCaption("property")}
      title={TITLE}
      step={lodgingStep("property")}
      subtitle="Travellers see these on your listing. Fields marked * are needed for review."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}

        <section className={v.section} aria-labelledby="sec-property">
          <SectionHead n={1} id="sec-property" title="Your property" sub="What it is and who runs it" />
          <AuthField label="Property name *" icon={Building2} placeholder="e.g. Rakaposhi View Guest House" {...field("hotelName")} />
          <div className={styles.field}>
            <span className={v.choiceLabel}>Type of lodging *</span>
            <div className={v.options} role="radiogroup" aria-label="Type of lodging">
              {LODGING_TYPES.map((option) => {
                const on = x.hotelType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`${v.option} ${on ? v.optionOn : ""}`}
                    onClick={() => set("hotelType", option.value)}
                  >
                    <span className={v.radio} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.hotelType ? <span className={v.fieldError}>{fieldErrors.hotelType}</span> : null}
          </div>
          <div className={styles.row2}>
            <AuthField label="Manager name *" icon={UserRound} autoComplete="name" {...field("managerName")} />
            <AuthField label="Mobile number *" icon={Phone} type="tel" placeholder="03XX XXXXXXX" {...field("phone")} />
          </div>
          <div className={styles.row2}>
            <AuthField label="Landline (optional)" icon={Phone} type="tel" {...field("landline")} />
            <AuthField label="Email" icon={Mail} type="email" {...field("email")} />
          </div>
        </section>

        <section className={v.section} aria-labelledby="sec-address">
          <SectionHead n={2} id="sec-address" title="Address" sub="From your map pin — correct it if needed" />
          <div className={styles.row2}>
            <AuthField label="Village / area *" icon={MapPin} placeholder="e.g. Karimabad" {...field("village")} />
            <AuthField label="District *" icon={MapPin} placeholder="e.g. Hunza" {...field("district")} />
          </div>
          <div className={styles.row2}>
            <AuthField label="City *" icon={MapPin} {...field("city")} />
            <AuthField label="Street address *" icon={MapPin} {...field("address")} />
          </div>
        </section>

        <section className={v.section} aria-labelledby="sec-business">
          <SectionHead n={3} id="sec-business" title="Business" sub="Checked by BANJARA during review" />
          <div className={styles.row2}>
            <AuthField label="Business registration number *" icon={BadgeCheck} placeholder="e.g. GB-HTL-2231" {...field("businessRegistrationNumber")} />
            <AuthField label="Years in hospitality *" icon={CalendarClock} inputMode="numeric" placeholder="0" {...field("yearsExperience")} />
          </div>
        </section>

        <section className={v.section} aria-labelledby="sec-stay">
          <SectionHead n={4} id="sec-stay" title="Stays" sub="What guests can expect" />
          <div className={styles.row2}>
            <AuthField label="Check-in from *" icon={Clock3} type="time" {...field("checkInTime")} />
            <AuthField label="Check-out by *" icon={Clock3} type="time" {...field("checkOutTime")} />
          </div>
          <div className={styles.field}>
            <span className={v.choiceLabel}>Restaurant or meals at the property? *</span>
            <div className={v.options} role="radiogroup" aria-label="Restaurant">
              {[
                { value: "yes", label: "Yes", sub: "Guests can eat here" },
                { value: "no", label: "No", sub: "Rooms only" },
              ].map((option) => {
                const on = x.restaurantAvailable === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`${v.option} ${on ? v.optionOn : ""}`}
                    onClick={() => set("restaurantAvailable", option.value)}
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
            {fieldErrors.restaurantAvailable ? <span className={v.fieldError}>{fieldErrors.restaurantAvailable}</span> : null}
          </div>
          <div className={styles.field}>
            <span className={v.choiceLabel}>Facilities</span>
            <div className={v.chips}>
              {PROPERTY_AMENITIES.map((item) => {
                const on = x.amenities.includes(item);
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
          <AuthField
            label="About the property"
            icon={Building2}
            placeholder="Views, nearby sights, what makes it special"
            {...field("description")}
          />
        </section>

        <section className={v.section} aria-labelledby="sec-online">
          <SectionHead n={5} id="sec-online" title="Online (optional)" sub="Helps travellers trust your listing" />
          <div className={styles.row2}>
            <AuthField label="Website" icon={Globe} placeholder="https://" {...field("website")} />
            <AuthField label="Facebook" icon={Globe} {...field("socialFacebook")} />
          </div>
          <div className={styles.row2}>
            <AuthField label="Instagram" icon={Globe} {...field("socialInstagram")} />
            <AuthField label="TikTok" icon={Globe} {...field("socialTiktok")} />
          </div>
        </section>

        <button type="button" className={styles.primary} disabled={saving} onClick={() => void save()}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save and continue"}
          {saving ? null : <ArrowRight size={16} />}
        </button>
      </div>
    </AuthShell>
  );
}
