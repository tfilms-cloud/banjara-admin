"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-config";
import { PlaceSearch, describe } from "@/components/auth/driver-location";
import type { LatLng } from "@/components/auth/location-map";
import {
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from "@/services/customer/provider-application.service";
import {
  createPickupPoint,
  type TripStop,
} from "@/services/customer/provider-trips.service";
import s from "./stop-picker.module.css";

const LocationMap = dynamic(() => import("@/components/auth/location-map"), {
  ssr: false,
  loading: () => <div className={s.mapLoading}>Loading map…</div>,
});

/**
 * Pickup / drop-off field: each stop is pinned on the map (like the app's
 * "Pin a pickup"), saved as one of the driver's pickup points.
 */
export function StopPicker({
  kind,
  values,
  onChange,
  suggestions,
  near,
}: {
  kind: "pickup" | "dropoff";
  values: TripStop[];
  onChange: (values: TripStop[]) => void;
  /** Places the driver used before; one tap adds them. */
  suggestions: string[];
  /** Where to open the map (the trip's start for pickups, its end for drop-offs). */
  near: string;
}) {
  const [open, setOpen] = useState(false);
  const label = kind === "pickup" ? "Pickup points" : "Drop-off points";
  const has = (name: string) =>
    values.some((v) => v.name.toLowerCase() === name.toLowerCase());
  const unused = suggestions.filter((x) => !has(x)).slice(0, 6);

  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      {values.length ? (
        <ul className={s.stops}>
          {values.map((stop, index) => (
            <li key={`${stop.id ?? stop.name}-${index}`}>
              <span
                className={`${s.stopIcon} ${kind === "dropoff" ? s.dropIcon : ""}`}
              >
                <MapPin size={14} />
              </span>
              <span className={s.stopText}>
                <strong>{stop.name}</strong>
                <small>
                  {stop.address ||
                    (stop.id ? "Pinned on the map" : "Located by name")}
                </small>
              </span>
              <button
                type="button"
                className={s.remove}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                aria-label={`Remove ${stop.name}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className={s.open} onClick={() => setOpen(true)}>
        <MapPin size={15} />
        <span>
          {values.length
            ? `Add another ${kind === "pickup" ? "pickup" : "drop-off"}`
            : `Search or pin a ${kind === "pickup" ? "pickup" : "drop-off"} on the map`}
        </span>
        <Plus size={15} className={s.plus} />
      </button>
      {unused.length ? (
        <div className={s.suggest}>
          <small>Your places:</small>
          {unused.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange([...values, { name }])}
            >
              <Plus size={11} /> {name}
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <PinDialog
          kind={kind}
          near={near}
          onClose={() => setOpen(false)}
          onSaved={(stop) => {
            if (!has(stop.name)) onChange([...values, stop]);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function PinDialog({
  kind,
  near,
  onClose,
  onSaved,
}: {
  kind: "pickup" | "dropoff";
  near: string;
  onClose: () => void;
  onSaved: (stop: TripStop) => void;
}) {
  const [center, setCenter] = useState<LatLng | null>(null);
  const [flyTo, setFlyTo] = useState<
    (LatLng & { key: number; zoom?: number }) | null
  >(null);
  const [moving, setMoving] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [looking, setLooking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRef(0);
  const title =
    kind === "pickup" ? "Pin a pickup point" : "Pin a drop-off point";

  // Open the map over the trip's town.
  useEffect(() => {
    if (!near.trim()) return;
    let live = true;
    void searchPlaces(near, 1)
      .then(([hit]) => {
        if (live && hit)
          setFlyTo({
            latitude: hit.latitude,
            longitude: hit.longitude,
            zoom: 14,
            key: Date.now(),
          });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [near]);

  // Esc closes; the page behind doesn't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Name the spot under the pin once the map stops (unless the driver typed a name).
  const settle = (point: LatLng) => {
    setCenter(point);
    setMoving(false);
    if (!placed) return;
    const ticket = ++lookup.current;
    setLooking(true);
    void reverseGeocode(point.latitude, point.longitude)
      .then((found) => {
        if (ticket !== lookup.current || !found) return;
        setAddress(describe(found.address));
        if (!nameTouched)
          setName(found.name || found.address.area || found.address.city || "");
      })
      .catch(() => {})
      .finally(() => ticket === lookup.current && setLooking(false));
  };

  const pick = (place: PlaceResult) => {
    setPlaced(true);
    setNameTouched(false);
    setName(place.name);
    setAddress(describe(place.address));
    setFlyTo({
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: 17,
      key: Date.now(),
    });
  };

  const locate = () => {
    if (!navigator.geolocation)
      return setError("Your browser can’t share its location. Search instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPlaced(true);
        setFlyTo({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          zoom: 17,
          key: Date.now(),
        });
      },
      (reason) => {
        setLocating(false);
        setError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser, or search instead."
            : "We couldn’t find your location. Search instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const save = async () => {
    setError("");
    if (!placed || !center)
      return setError(
        "Search for the place or move the map so the pin sits on it.",
      );
    if (name.trim().length < 2)
      return setError(
        `Give this ${kind === "pickup" ? "pickup" : "drop-off"} a name travellers will recognise.`,
      );
    setSaving(true);
    try {
      onSaved(
        await createPickupPoint({
          name: name.trim(),
          address: address.trim() || name.trim(),
          latitude: Number(center.latitude.toFixed(6)),
          longitude: Number(center.longitude.toFixed(6)),
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t save this place.",
      );
      setSaving(false);
    }
  };

  return (
    <div
      className={s.backdrop}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={s.head}>
          <div>
            <h3>{title}</h3>
            <p>
              Search for the place, or drag the map so the pin sits exactly
              where travellers should {kind === "pickup" ? "wait" : "get off"}.
            </p>
          </div>
          <button
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className={s.searchRow}>
          <PlaceSearch
            onPick={pick}
            label="Search a place"
            placeholder={
              kind === "pickup"
                ? "e.g. Karimabad bazaar, Gilgit bus stand"
                : "e.g. Aliabad chowk, Sost"
            }
          />
        </div>

        <div className={s.mapBox}>
          <LocationMap
            center={{
              latitude: DEFAULT_CENTER[0],
              longitude: DEFAULT_CENTER[1],
            }}
            zoom={DEFAULT_ZOOM}
            flyTo={flyTo}
            onMoveStart={() => {
              setMoving(true);
              setPlaced(true);
            }}
            onCenterChange={settle}
          />
          <button
            type="button"
            className={s.locate}
            onClick={locate}
            disabled={locating}
          >
            {locating ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <LocateFixed size={14} />
            )}{" "}
            My location
          </button>
          {!placed ? (
            <span className={s.hint}>
              Search above or drag the map to place the pin
            </span>
          ) : null}
        </div>

        <div className={s.details}>
          <label className={s.nameField}>
            <span>Name travellers will see *</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              placeholder={
                kind === "pickup"
                  ? "e.g. Karimabad bazaar, near the mosque"
                  : "e.g. Aliabad chowk"
              }
              maxLength={80}
            />
          </label>
          <p className={s.address}>
            <MapPin size={13} />
            {looking
              ? "Finding the address…"
              : address ||
                (placed ? "Address will appear here" : "No place chosen yet")}
          </p>
          {error ? <p className={s.error}>{error}</p> : null}
          <div className={s.actions}>
            <button
              type="button"
              className={s.ghost}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={s.primary}
              onClick={() => void save()}
              disabled={saving || moving}
            >
              {saving ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}{" "}
              Save {kind === "pickup" ? "pickup" : "drop-off"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
