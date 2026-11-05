"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
// The site's query hook waits until the backend is confirmed online; the plain one
// races the cache reset that happens when the connection check completes.
import { useBackendStatus, useQuery } from "@/lib/live-query";
import {
  ArrowRight,
  Building2,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-config";
import {
  DRIVER_STEP_TOTAL,
  driverStepHref,
  driverStepNumber,
} from "@/lib/driver-steps";
import { getProviderApplication } from "@/services/customer/auth.service";
import {
  reverseGeocode,
  saveDriverLocation,
  searchPlaces,
  type PlaceResult,
  type StructuredAddress,
} from "@/services/customer/provider-application.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner, AuthField } from "./auth-fields";
import type { LatLng } from "./location-map";
import styles from "./auth.module.css";
import loc from "./location.module.css";

// Leaflet needs `window`, so the map only loads in the browser.
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => (
    <div className={loc.mapWrap} role="status" aria-label="Loading map" />
  ),
});

const STEP = driverStepNumber("location");

export function describe(address: StructuredAddress | undefined): string {
  if (!address) return "";
  return (
    address.formattedAddress ||
    [address.street, address.area, address.city, address.region]
      .filter(Boolean)
      .join(", ")
  );
}

/** Step 4 for local drivers: pin the base they drive from. */
export function DriverLocation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useCustomerAuth();
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
  const data = application.data;
  const isDriver = Boolean(data?.services.includes("transport"));

  // Only drivers who have started an application belong here.
  useEffect(() => {
    if (application.isPending || application.isError) return;
    if (!data) router.replace("/provider-application");
    else if (!isDriver) router.replace("/provider");
  }, [application.isPending, application.isError, data, isDriver, router]);

  // Open the map on the saved pin, else on the city from step 3, else the north.
  const start = useQuery({
    queryKey: ["provider", "location-start", data?.location, data?.city],
    enabled: Boolean(data && isDriver),
    staleTime: Infinity,
    queryFn: async (): Promise<{
      center: LatLng;
      zoom: number;
      hasPin: boolean;
    }> => {
      if (data?.location)
        return { center: data.location, zoom: 16, hasPin: true };
      if (data?.city) {
        const match = (await searchPlaces(data.city, 1).catch(() => []))[0];
        if (match) return { center: match, zoom: 13, hasPin: false };
      }
      return {
        center: { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1] },
        zoom: DEFAULT_ZOOM,
        hasPin: false,
      };
    },
  });

  const backend = useBackendStatus();
  if ((application.isError || start.isError) && backend !== "checking") {
    return (
      <AuthShell
        caption={`Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`}
        title="Your location"
      >
        <AuthBanner>
          {(application.error ?? start.error)?.message ||
            "We couldn’t load your application. Check your connection and refresh the page."}
        </AuthBanner>
      </AuthShell>
    );
  }
  if (
    loading ||
    !isProvider ||
    backend === "checking" ||
    application.isPending ||
    start.isPending ||
    !data ||
    !isDriver
  ) {
    return (
      <AuthShell
        caption={`Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`}
        title="Your location"
      >
        <p className={styles.note} role="status">
          <LoaderCircle size={15} className="animate-spin" /> Loading your
          application…
        </p>
      </AuthShell>
    );
  }

  if (start.isError || !start.data) {
    return (
      <AuthShell
        caption={`Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`}
        title="Your location"
      >
        <AuthBanner>
          We couldn’t load the map. Check your connection and refresh the page.
        </AuthBanner>
      </AuthShell>
    );
  }

  return (
    <LocationForm
      initial={start.data}
      initialAddress={data.address ?? ""}
      initialCity={data.city ?? ""}
      onSaved={async () => {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["provider", "application", user.id],
          queryFn: getProviderApplication,
          // Always ask the server: the step just saved changed what comes next.
          staleTime: 0,
        });
        router.replace(
          driverStepHref(fresh?.progress?.nextStep) ?? "/provider",
        );
      }}
    />
  );
}

function LocationForm({
  initial,
  initialAddress,
  initialCity,
  onSaved,
}: {
  initial: { center: LatLng; zoom: number; hasPin: boolean };
  initialAddress: string;
  initialCity: string;
  onSaved: () => Promise<void>;
}) {
  const [center, setCenter] = useState<LatLng>(initial.center);
  const [flyTo, setFlyTo] = useState<
    (LatLng & { key: number; zoom?: number }) | null
  >(null);
  const [moving, setMoving] = useState(false);
  const [placed, setPlaced] = useState(initial.hasPin);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [looking, setLooking] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [addressEdited, setAddressEdited] = useState(
    Boolean(initial.hasPin && initialAddress),
  );
  const [city, setCity] = useState(initialCity);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    address?: string;
    city?: string;
  }>({});

  // Look up the address under the pin once the map settles.
  const lookup = useRef(0);
  useEffect(() => {
    if (!placed) return;
    const id = ++lookup.current;
    const timer = window.setTimeout(async () => {
      setLooking(true);
      try {
        const found = await reverseGeocode(center.latitude, center.longitude);
        if (id !== lookup.current || !found) return;
        setPlace(found);
        if (!addressEdited) setAddress(describe(found.address));
        setCity((current) => current || found.address.city || "");
      } catch {
        // Keep whatever address the driver has; they can type it.
      } finally {
        if (id === lookup.current) setLooking(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
    // `addressEdited` is read at lookup time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, placed]);

  const useMyLocation = () => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError(
        "Your browser can’t share your location. Search for your area instead.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setPlaced(true);
        setFlyTo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoom: 17,
          key: Date.now(),
        });
      },
      (reason) => {
        setLocating(false);
        setError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser, or search for your area."
            : "We couldn’t find your location. Search for your area instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const save = async () => {
    const errors: typeof fieldErrors = {};
    if (address.trim().length < 5) errors.address = "Enter your address";
    if (city.trim().length < 2) errors.city = "Enter your city";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setError("");
    setSaving(true);
    try {
      await saveDriverLocation({
        latitude: center.latitude,
        longitude: center.longitude,
        address,
        city,
        structured: place?.address ?? {},
      });
      await onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "We couldn’t save your location. Please try again.",
      );
      setSaving(false);
    }
  };

  const map = (
    <div className={`${loc.mapWrap} ${moving ? loc.moving : ""}`}>
      <LocationMap
        center={initial.center}
        zoom={initial.zoom}
        flyTo={flyTo}
        onMoveStart={() => setMoving(true)}
        onCenterChange={(point) => {
          setMoving(false);
          setCenter(point);
          setPlaced(true);
        }}
      />
      <div className={loc.mapTools}>
        <button
          type="button"
          className={loc.mapButton}
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <LocateFixed size={15} />
          )}
          {locating ? "Finding you…" : "Use my current location"}
        </button>
      </div>
      {!placed ? (
        <p className={loc.mapHint}>Move the map to put the pin on your base</p>
      ) : null}
    </div>
  );

  return (
    <AuthShell
      aside={map}
      caption={`Local driver · Step ${STEP} of ${DRIVER_STEP_TOTAL}`}
      title="Where do you drive from?"
      step={{ current: STEP, total: DRIVER_STEP_TOTAL }}
      subtitle="Pin the place where travellers usually meet you — your home, stand or terminal. It helps travellers find drivers near them."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        {error ? <AuthBanner>{error}</AuthBanner> : null}
        <PlaceSearch
          onPick={(result) => {
            setPlaced(true);
            setPlace(result);
            setAddressEdited(false);
            setAddress(describe(result.address));
            if (result.address.city) setCity(result.address.city);
            setFlyTo({
              latitude: result.latitude,
              longitude: result.longitude,
              zoom: 16,
              key: Date.now(),
            });
          }}
        />

        <div className={loc.addressCard} aria-live="polite">
          <span className={loc.addressIcon}>
            {looking ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <MapPin size={17} />
            )}
          </span>
          <div className={loc.addressText}>
            <small>Pinned location</small>
            <strong>
              {!placed
                ? "Not placed yet"
                : looking && !place
                  ? "Finding the address…"
                  : place?.name ||
                    describe(place?.address) ||
                    "Location selected"}
            </strong>
            {placed ? (
              <span>
                {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
              </span>
            ) : null}
          </div>
        </div>

        <AuthField
          label="Address"
          icon={Navigation}
          value={address}
          placeholder="Street, area and city"
          hint="Filled from the map. Edit it if travellers know the place by another name."
          error={fieldErrors.address}
          onChange={(event) => {
            setAddress(event.target.value);
            setAddressEdited(true);
          }}
        />
        <AuthField
          label="City"
          icon={Building2}
          value={city}
          placeholder="e.g. Hunza"
          error={fieldErrors.city}
          onChange={(event) => setCity(event.target.value)}
        />

        <button
          type="button"
          className={styles.primary}
          disabled={!placed || saving || moving}
          onClick={() => void save()}
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save location and continue"}
          {saving ? null : <ArrowRight size={16} />}
        </button>
      </div>
    </AuthShell>
  );
}

/** Search box with suggestions from the app's place search. */
export function PlaceSearch({
  onPick,
  label = "Search for your area",
  placeholder = "e.g. Karimabad, Aliabad, Gilgit bus stand",
  initial = "",
}: {
  onPick: (place: PlaceResult) => void;
  label?: string;
  placeholder?: string;
  /** Text to start with (and search for). */
  initial?: string;
}) {
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results = useQuery({
    queryKey: ["places", debounced],
    queryFn: () => searchPlaces(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const items = useMemo(() => results.data ?? [], [results.data]);

  const pick = (place: PlaceResult) => {
    setQuery(place.name);
    setOpen(false);
    onPick(place);
  };

  return (
    <div className={loc.search}>
      <AuthField
        label={label}
        icon={Search}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && debounced.length >= 2}
        aria-controls="place-results"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (!items.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, items.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            pick(items[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && debounced.length >= 2 ? (
        <ul id="place-results" className={loc.results} role="listbox">
          {results.isFetching && !items.length ? (
            <li className={loc.resultEmpty}>Searching…</li>
          ) : items.length ? (
            items.map((item, index) => (
              <li
                key={`${item.latitude},${item.longitude},${index}`}
                role="option"
                aria-selected={index === active}
              >
                <button
                  type="button"
                  className={`${loc.result} ${index === active ? loc.resultActive : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(item)}
                >
                  <MapPin size={15} />
                  <span>
                    <strong>{item.name || item.address.city}</strong>
                    <span>{describe(item.address)}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className={loc.resultEmpty}>
              No places found. Try a nearby town or landmark.
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
