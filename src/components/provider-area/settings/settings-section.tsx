"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, KeyRound, LoaderCircle, LogOut, Monitor, Pencil, Plus, Route, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { validateNewPassword } from "@/lib/customer-profile";
import { useMutation, useQuery } from "@/lib/live-query";
import { PASSWORD_HINT } from "@/lib/password-rule";
import {
  changeCustomerPassword,
  getCustomerNotificationPreferences,
  saveCustomerNotificationPreferences,
} from "@/services/customer/profile.service";
import {
  describeDevice,
  listDeviceSessions,
  signOutAllDevices,
  signOutDevice,
} from "@/services/customer/session.service";
import type { NotificationPreferences } from "@/types/customer/profile";
import {
  getDriverIntercitySettings,
  getIntercityCities,
  saveDriverIntercitySettings,
  type DriverIntercitySettings,
  type DriverRoute,
} from "@/services/customer/intercity.service";
import { DRIVER_INTERCITY_SETTINGS_KEY, useIsTransportProvider } from "../intercity/intercity-section";
import s from "../sections/sections.module.css";
import st from "./settings.module.css";

const DEVICES_KEY = ["provider", "device-sessions"];
const PREFS_KEY = ["provider", "notification-preferences"];

/** Provider area → Settings: account, alerts, password and signed-in devices. */
export function SettingsSection() {
  return (
    <div className={s.page}>
      <AccountCard />
      <IntercityCard />
      <div className={s.grid2}>
        <NotificationsCard />
        <PasswordCard />
      </div>
      <DevicesCard />
    </div>
  );
}

function CardTitle({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children?: ReactNode }) {
  return (
    <div className={s.cardHead}>
      <h3 className={st.title}>
        <Icon size={16} /> {title}
      </h3>
      {children}
    </div>
  );
}

function AccountCard() {
  const { user } = useCustomerAuth();
  return (
    <section className={s.card}>
      <CardTitle icon={UserRound} title="Account">
        <Link href="/provider/profile" className={s.edit}>
          <Pencil size={13} /> Edit in Profile
        </Link>
      </CardTitle>
      <dl className={s.facts}>
        <div>
          <dt>Name</dt>
          <dd>{user?.name || "—"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user?.email || "—"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{user?.phone || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}

/** The alerts a driver cares about. `pushEnabled`, `offers` and `system` keep their values. */
const ALERTS: Array<{ key: keyof NotificationPreferences; label: string; hint: string }> = [
  { key: "bookings", label: "Booking requests", hint: "New requests, cancellations and changes" },
  { key: "trips", label: "Trip reminders", hint: "Upcoming departures and trip updates" },
  { key: "messages", label: "Messages", hint: "When a traveller writes to you" },
  { key: "payments", label: "Payments", hint: "Payment proofs, payouts and refunds" },
  { key: "reviews", label: "Reviews", hint: "When a traveller rates a trip" },
];

function NotificationsCard() {
  const client = useQueryClient();
  const prefs = useQuery({ queryKey: PREFS_KEY, queryFn: getCustomerNotificationPreferences });
  // The switch flips at once (pending save); the saved value takes over again after.
  const [pending, setPending] = useState<NotificationPreferences | null>(null);
  const draft = pending ?? prefs.data ?? null;

  const save = useMutation({
    mutationFn: (next: NotificationPreferences) => saveCustomerNotificationPreferences(next),
    onSuccess: (saved) => {
      client.setQueryData(PREFS_KEY, saved);
      setPending(null);
      toast.success("Notification settings saved");
    },
    onError: (error) => {
      // Put the switch back to what the server has.
      setPending(null);
      toast.error(error instanceof Error ? error.message : "Could not save");
    },
  });

  const toggle = (key: keyof NotificationPreferences) => {
    if (!draft) return;
    const next = { ...draft, [key]: !draft[key] };
    setPending(next);
    save.mutate(next);
  };

  return (
    <section className={s.card}>
      <CardTitle icon={Bell} title="Notifications" />
      {prefs.isPending || !draft ? (
        prefs.isError ? (
          <p className={s.error}>{prefs.error.message}</p>
        ) : (
          <p className={st.muted}>
            <LoaderCircle size={14} className={st.spin} /> Loading…
          </p>
        )
      ) : (
        <ul className={st.toggles}>
          {ALERTS.map((alert) => (
            <li key={alert.key}>
              <div>
                <strong>{alert.label}</strong>
                <span>{alert.hint}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(draft[alert.key])}
                aria-label={alert.label}
                className={`${st.switch} ${draft[alert.key] ? st.switchOn : ""}`}
                disabled={save.isPending}
                onClick={() => toggle(alert.key)}
              >
                <span />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PasswordCard() {
  const client = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const change = useMutation({
    mutationFn: () => changeCustomerPassword(current, next),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
      toast.success("Password updated. Your other devices were signed out.");
      void client.invalidateQueries({ queryKey: DEVICES_KEY });
    },
    onError: (failure) => setError(failure instanceof Error ? failure.message : "Could not update the password"),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(current, next, confirm);
    setError(problem);
    if (!problem) change.mutate();
  };
  const busy = change.isPending;

  return (
    <section className={s.card}>
      <CardTitle icon={KeyRound} title="Password" />
      <form className={st.form} onSubmit={submit}>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            maxLength={200}
            required
            disabled={busy}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            placeholder={PASSWORD_HINT}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            maxLength={72}
            required
            disabled={busy}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            maxLength={72}
            required
            disabled={busy}
          />
        </label>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <p className={st.muted}>Changing it signs you out on your other devices.</p>
        <button type="submit" className={s.primary} disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

function DevicesCard() {
  const client = useQueryClient();
  const { logout } = useCustomerAuth();
  const sessions = useQuery({ queryKey: DEVICES_KEY, queryFn: listDeviceSessions });
  const [busy, setBusy] = useState<string | null>(null);

  const signOutOne = async (id: string) => {
    setBusy(id);
    try {
      await signOutDevice(id);
      toast.success("That device was signed out.");
      await client.invalidateQueries({ queryKey: DEVICES_KEY });
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not sign out that device.");
    } finally {
      setBusy(null);
    }
  };

  const signOutEverywhere = async () => {
    setBusy("all");
    try {
      await signOutAllDevices();
      toast.success("Signed out on all devices.");
      await logout();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not sign out everywhere.");
      setBusy(null);
    }
  };

  return (
    <section className={s.card}>
      <CardTitle icon={ShieldCheck} title="Where you are signed in" />
      <p className={st.muted}>Sign out any device you do not recognise.</p>
      {sessions.isPending ? (
        <p className={st.muted}>
          <LoaderCircle size={14} className={st.spin} /> Loading devices…
        </p>
      ) : sessions.isError ? (
        <p className={s.error}>{sessions.error.message}</p>
      ) : (
        <ul className={s.list}>
          {sessions.data.map((session) => (
            <li key={session.id} className={s.row}>
              <span className={s.rowIcon}>
                {session.client === "mobile" ? <Smartphone size={17} /> : <Monitor size={17} />}
              </span>
              <div className={s.rowMain}>
                <strong>
                  {describeDevice(session)}
                  {session.current ? <span className={`${s.badge} ${s.badgeTeal} ${st.current}`}>This device</span> : null}
                </strong>
                <span>Last active {new Date(session.lastUsedAt).toLocaleString()}</span>
              </div>
              {!session.current ? (
                <button
                  type="button"
                  className={s.secondary}
                  disabled={busy !== null}
                  onClick={() => void signOutOne(session.id)}
                >
                  {busy === session.id ? "Signing out…" : "Sign out"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className={st.actions}>
        <button type="button" className={s.danger} disabled={busy !== null} onClick={() => void signOutEverywhere()}>
          <LogOut size={15} /> {busy === "all" ? "Signing out…" : "Sign out of all devices"}
        </button>
      </div>
    </section>
  );
}

/** Drivers opt in to City to City requests: home city, preferred routes and shared rides. */
function IntercityCard() {
  const { isTransport } = useIsTransportProvider();
  const settings = useQuery({
    queryKey: DRIVER_INTERCITY_SETTINGS_KEY,
    queryFn: getDriverIntercitySettings,
    enabled: isTransport,
  });
  const show = isTransport && settings.data?.featureEnabled === true;
  const cities = useQuery({ queryKey: ["intercity", "cities"], queryFn: getIntercityCities, enabled: show, staleTime: 5 * 60_000 });
  if (!show || !settings.data) return null;
  return <IntercityForm key={JSON.stringify(settings.data)} saved={settings.data} cities={cities.data ?? []} />;
}

function IntercityForm({
  saved,
  cities,
}: {
  saved: DriverIntercitySettings;
  cities: Array<{ id: string; name: string; province: string }>;
}) {
  const client = useQueryClient();
  const [enabled, setEnabled] = useState(saved.enabled);
  const [homeCityId, setHomeCityId] = useState(saved.homeCityId ?? "");
  const [routes, setRoutes] = useState<DriverRoute[]>(saved.preferredRoutes);
  const [acceptsShared, setAcceptsShared] = useState(saved.acceptsShared);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? "Unknown city";

  const save = useMutation({
    mutationFn: () =>
      saveDriverIntercitySettings({
        enabled,
        homeCityId: homeCityId || null,
        preferredRoutes: routes,
        acceptsShared,
      }),
    onSuccess: (next) => {
      client.setQueryData(DRIVER_INTERCITY_SETTINGS_KEY, next);
      void client.invalidateQueries({ queryKey: ["provider", "intercity-requests"] });
      toast.success("City to City settings saved");
    },
    onError: (failure) => setError(failure instanceof Error ? failure.message : "Could not save"),
  });

  const addRoute = () => {
    setError("");
    if (!from || !to) return setError("Choose both cities for the route.");
    if (from === to) return setError("A route needs two different cities.");
    if (routes.some((r) => r.fromCityId === from && r.toCityId === to)) return setError("That route is already on your list.");
    if (routes.length >= 20) return setError("You can keep up to 20 routes.");
    setRoutes([...routes, { fromCityId: from, toCityId: to }]);
    setFrom("");
    setTo("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (enabled && !homeCityId) return setError("Choose your home city to receive requests.");
    save.mutate();
  };
  const busy = save.isPending;

  return (
    <section className={s.card}>
      <CardTitle icon={Route} title="City to City rides" />
      <p className={st.muted}>Get door-to-door ride requests between cities. Travellers pay you in cash.</p>
      <form className={st.form} onSubmit={submit}>
        <ul className={st.toggles}>
          <li>
            <div>
              <strong>Receive City to City requests</strong>
              <span>Requests starting in or near your home city</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Receive City to City requests"
              className={`${st.switch} ${enabled ? st.switchOn : ""}`}
              disabled={busy}
              onClick={() => setEnabled(!enabled)}
            >
              <span />
            </button>
          </li>
          <li>
            <div>
              <strong>Accept shared rides</strong>
              <span>Travellers book single seats and share your vehicle</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={acceptsShared}
              aria-label="Accept shared rides"
              className={`${st.switch} ${acceptsShared ? st.switchOn : ""}`}
              disabled={busy}
              onClick={() => setAcceptsShared(!acceptsShared)}
            >
              <span />
            </button>
          </li>
        </ul>
        <label>
          Home city
          <select className={st.select} value={homeCityId} onChange={(e) => setHomeCityId(e.target.value)} disabled={busy}>
            <option value="">Choose a city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
                {city.province ? ` · ${city.province}` : ""}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={st.routes}>
          <legend>Preferred routes (optional)</legend>
          {routes.length ? (
            <ul>
              {routes.map((route, index) => (
                <li key={`${route.fromCityId}-${route.toCityId}`}>
                  <span>
                    {cityName(route.fromCityId)} → {cityName(route.toCityId)}
                  </span>
                  <button
                    type="button"
                    className={s.secondary}
                    onClick={() => setRoutes(routes.filter((_, i) => i !== index))}
                    aria-label={`Remove ${cityName(route.fromCityId)} to ${cityName(route.toCityId)}`}
                    disabled={busy}
                  >
                    <X size={13} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={st.muted}>No routes yet: you get requests from your home city.</p>
          )}
          <div className={st.routeAdd}>
            <label>
              From
              <select className={st.select} value={from} onChange={(e) => setFrom(e.target.value)} disabled={busy}>
                <option value="">City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              To
              <select className={st.select} value={to} onChange={(e) => setTo(e.target.value)} disabled={busy}>
                <option value="">City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={s.secondary} onClick={addRoute} disabled={busy}>
              <Plus size={14} /> Add route
            </button>
          </div>
        </fieldset>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={s.primary} disabled={busy}>
          {busy ? "Saving…" : "Save City to City settings"}
        </button>
      </form>
    </section>
  );
}
