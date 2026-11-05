"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@/lib/live-query";
import {
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  LoaderCircle,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { HomeDialog, HomeState } from "@/components/site/home/home-primitives";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { EXPLORE_DESTINATIONS } from "@/lib/explore-destinations";
import { validateNewPassword } from "@/lib/customer-profile";
import {
  applyCustomerProfile,
  changeCustomerPassword,
  getCustomerNotificationPreferences,
  getSavedListing,
  saveCustomerAvatar,
  saveCustomerNotificationPreferences,
} from "@/services/customer/profile.service";
import {
  describeDevice,
  listDeviceSessions,
  signOutAllDevices,
  signOutDevice,
} from "@/services/customer/session.service";
import type {
  CustomerProfile,
  NotificationPreferences,
  SavedItem,
} from "@/types/customer/profile";
import styles from "./profile.module.css";

export type ProfileDialog =
  "saved" | "notifications" | "security" | "photo" | "checklist" | null;
export function ProfileDialogs({
  dialog,
  onClose,
  ownerId,
  saved,
  destinations,
  onProfile,
  savedLoading,
  savedError,
  retrySaved,
}: {
  dialog: ProfileDialog;
  onClose: () => void;
  ownerId: string;
  saved: SavedItem[];
  destinations: string[];
  onProfile: (profile: CustomerProfile) => void;
  savedLoading: boolean;
  savedError: string;
  retrySaved: () => void;
}) {
  if (!dialog) return null;
  if (dialog === "saved" && (savedLoading || savedError))
    return (
      <HomeDialog title="Saved & favorites" onClose={onClose}>
        <HomeState
          title={
            savedError ? "Could not load saved items" : "Loading saved items…"
          }
          description={
            savedError ||
            "Fetching your account favorites and device destinations."
          }
          loading={savedLoading && !savedError}
          retry={savedError ? retrySaved : undefined}
        />
      </HomeDialog>
    );
  if (dialog === "saved")
    return (
      <SavedDialog
        items={saved}
        destinations={destinations}
        onClose={onClose}
      />
    );
  if (dialog === "notifications")
    return <NotificationDialog ownerId={ownerId} onClose={onClose} />;
  if (dialog === "security") return <SecurityDialog onClose={onClose} />;
  if (dialog === "photo")
    return <PhotoDialog onClose={onClose} onProfile={onProfile} />;
  return (
    <HomeDialog title="Before you travel" onClose={onClose}>
      <div className={styles.checklist}>
        <ShieldCheck size={30} />
        <p>
          Keep your travel arrangements easy to reach, even when reception is
          limited.
        </p>
        <ul>
          <li>Download your issued booking passes before departure.</li>
          <li>
            Confirm the pickup point, meeting time and luggage allowance with
            your provider.
          </li>
          <li>Keep your provider’s published contact details available.</li>
          <li>
            Check current route conditions with your provider before leaving.
          </li>
        </ul>
        <Link className={styles.primary} href="/account/bookings">
          Open my bookings
        </Link>
      </div>
    </HomeDialog>
  );
}
function SavedDialog({
  items,
  destinations,
  onClose,
}: {
  items: SavedItem[];
  destinations: string[];
  onClose: () => void;
}) {
  const [limit, setLimit] = useState(8);
  const listings = useQueries({
    queries: items.slice(0, limit).map((item) => ({
      queryKey: ["customer", "saved-listing", item.kind, item.targetId],
      queryFn: () => getSavedListing(item),
      staleTime: 60000,
    })),
  });
  const valleys = EXPLORE_DESTINATIONS.filter((d) =>
    destinations.includes(d.id),
  );
  return (
    <HomeDialog title="Saved & favorites" onClose={onClose}>
      <p className={styles.dialogIntro}>
        Saved trips, stays and providers sync with your account. Saved
        destinations stay on this device.
      </p>
      {!items.length && !valleys.length ? (
        <HomeState
          title="Your next adventure is waiting"
          description="Save rides, stays and destinations as you explore."
        />
      ) : (
        <div className={styles.savedList}>
          {listings.map((query, index) =>
            query.isPending ? (
              <p key={items[index].id}>Loading saved {items[index].kind}…</p>
            ) : query.data ? (
              <Link key={items[index].id} href={query.data.href}>
                <span className={styles.iconTile}>
                  <Bookmark size={19} />
                </span>
                <span>
                  <strong>{query.data.name}</strong>
                  <small>{query.data.detail}</small>
                </span>
                <ChevronRight size={17} />
              </Link>
            ) : (
              <p key={items[index].id}>Could not load this saved listing.</p>
            ),
          )}
          {valleys.map((valley) => (
            <Link
              href={`/explore?q=${encodeURIComponent(valley.name)}`}
              key={valley.id}
            >
              <span className={styles.iconTile}>
                <Bookmark size={19} />
              </span>
              <span>
                <strong>{valley.name}</strong>
                <small>Saved destination · this device</small>
              </span>
              <ChevronRight size={17} />
            </Link>
          ))}
        </div>
      )}
      {items.length > limit && (
        <button
          className={styles.softButton}
          onClick={() => setLimit(limit + 8)}
        >
          Show more saved items
        </button>
      )}
      <Link className={styles.primary} href="/explore">
        Explore destinations
      </Link>
    </HomeDialog>
  );
}
function NotificationDialog({
  ownerId,
  onClose,
}: {
  ownerId: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["customer", "notification-preferences", ownerId],
    queryFn: getCustomerNotificationPreferences,
  });
  return (
    <HomeDialog title="Notification preferences" onClose={onClose}>
      {query.isPending ? (
        <HomeState
          title="Loading preferences…"
          description="Fetching your current notification settings."
          loading
        />
      ) : query.isError ? (
        <HomeState
          title="Could not load preferences"
          description={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <NotificationForm
          initial={query.data}
          ownerId={ownerId}
          onClose={onClose}
        />
      )}
    </HomeDialog>
  );
}
function NotificationForm({
  initial,
  ownerId,
  onClose,
}: {
  initial: NotificationPreferences;
  ownerId: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveCustomerNotificationPreferences,
    onSuccess: (next) => {
      client.setQueryData(
        ["customer", "notification-preferences", ownerId],
        next,
      );
      void client.invalidateQueries({
        queryKey: ["customer", "profile", ownerId],
      });
      toast.success("Notification preferences saved");
      onClose();
    },
  });
  const labels: [keyof NotificationPreferences, string][] = [
    ["pushEnabled", "Mobile push notifications"],
    ["bookings", "Bookings & confirmations"],
    ["payments", "Payment updates"],
    ["messages", "New messages"],
    ["trips", "Departure & pickup reminders"],
    ["offers", "Offers"],
    ["reviews", "Reviews"],
    ["system", "Account & system updates"],
  ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(value);
      }}
    >
      <p className={styles.dialogIntro}>
        Choose alerts sent to your registered BANJARA mobile devices. This does
        not enable browser push notifications.
      </p>
      <div className={styles.preferenceList}>
        {labels.map(([key, label]) => (
          <label key={key}>
            <span>
              <Bell size={16} />
              {label}
            </span>
            <input
              type="checkbox"
              checked={value[key]}
              disabled={mutation.isPending}
              onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
      {mutation.isError && (
        <p className={styles.error} role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className={styles.formActions}>
        <button
          className={styles.secondary}
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </button>
        <button className={styles.primary} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
function PhotoDialog({
  onClose,
  onProfile,
}: {
  onClose: () => void;
  onProfile: (profile: CustomerProfile) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const mutation = useMutation({
    mutationFn: saveCustomerAvatar,
    onSuccess: (profile) => {
      applyCustomerProfile(profile);
      onProfile(profile);
      toast.success("Profile photo updated");
      onClose();
    },
  });
  return (
    <HomeDialog
      title="Update profile photo"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <div className={styles.photoDialog}>
        {preview ? (
          <img src={preview} alt="New profile photo preview" />
        ) : (
          <span className={styles.photoEmpty}>
            <Upload size={32} />
          </span>
        )}
        <p>Choose a clear JPEG, PNG, WebP or GIF photo, up to 5 MB.</p>
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.currentTarget.value = "";
            if (!picked) return;
            if (
              !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
                picked.type,
              ) ||
              picked.size > 5 * 1024 * 1024
            ) {
              setError("Choose a supported photo smaller than 5 MB.");
              return;
            }
            setFile(picked);
            setPreview(URL.createObjectURL(picked));
            setError("");
          }}
        />
        <button
          className={styles.secondary}
          onClick={() => input.current?.click()}
          disabled={mutation.isPending}
        >
          Choose photo
        </button>
        <p className={styles.dialogIntro}>
          Your photo is uploaded only when you press Save photo.
        </p>
        {(error || mutation.isError) && (
          <p className={styles.error} role="alert">
            {error || mutation.error?.message}
          </p>
        )}
        <div className={styles.formActions}>
          <button
            className={styles.secondary}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            className={styles.primary}
            onClick={() => file && mutation.mutate(file)}
            disabled={!file || mutation.isPending}
          >
            {mutation.isPending ? (
              <LoaderCircle size={16} />
            ) : (
              <Check size={16} />
            )}{" "}
            {mutation.isPending ? "Uploading…" : "Save photo"}
          </button>
        </div>
      </div>
    </HomeDialog>
  );
}
function SecurityDialog({ onClose }: { onClose: () => void }) {
  const auth = useCustomerAuth();
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const mutation = useMutation({
    mutationFn: () => changeCustomerPassword(current, next),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated. Your other devices were signed out.");
      onClose();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(current, next, confirm);
    setError(problem);
    if (!problem) mutation.mutate();
  };
  return (
    <HomeDialog
      title="Security & account"
      onClose={() => {
        if (!mutation.isPending && !signingOut) onClose();
      }}
    >
      <form onSubmit={submit} className={styles.securityForm}>
        <h3>Change password</h3>
        <p className={styles.dialogIntro}>
          Use a password you do not use on other accounts.
        </p>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            maxLength={200}
            disabled={mutation.isPending}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            disabled={mutation.isPending}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            disabled={mutation.isPending}
          />
        </label>
        {(error || mutation.isError) && (
          <p className={styles.error} role="alert">
            {error || mutation.error?.message}
          </p>
        )}
        <button
          className={styles.primary}
          disabled={mutation.isPending || signingOut}
        >
          {mutation.isPending ? "Updating…" : "Update password"}
        </button>
      </form>
      <DevicesSection
        disabled={signingOut || mutation.isPending}
        onSignedOutEverywhere={async () => {
          setSigningOut(true);
          await auth.logout();
        }}
      />
      <div className={styles.signOut}>
        <h3>Sign out of this device</h3>
        <p>Your bookings and saved items stay in your account.</p>
        <button
          className={styles.dangerButton}
          disabled={signingOut || mutation.isPending}
          onClick={async () => {
            setSigningOut(true);
            try {
              await auth.logout();
            } catch (failure) {
              toast.error(
                failure instanceof Error
                  ? failure.message
                  : "Could not sign out.",
              );
              setSigningOut(false);
            }
          }}
        >
          <LogOut size={16} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </HomeDialog>
  );
}

function DevicesSection({
  disabled,
  onSignedOutEverywhere,
}: {
  disabled: boolean;
  onSignedOutEverywhere: () => Promise<void>;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const sessions = useQuery({
    queryKey: ["customer", "device-sessions"],
    queryFn: listDeviceSessions,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["customer", "device-sessions"] });

  const signOutOne = async (id: string) => {
    setBusy(id);
    try {
      await signOutDevice(id);
      toast.success("That device was signed out.");
      await refresh();
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
      await onSignedOutEverywhere();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not sign out everywhere.");
      setBusy(null);
    }
  };

  const list = sessions.data ?? [];
  return (
    <div className={styles.signOut}>
      <h3>Your devices</h3>
      <p>Where your account is signed in. Sign out any device you do not recognise.</p>
      {sessions.isPending ? (
        <p>
          <LoaderCircle size={14} className={styles.spin} /> Loading devices…
        </p>
      ) : sessions.isError ? (
        <p className={styles.error} role="alert">
          {sessions.error.message}
        </p>
      ) : (
        <ul className={styles.deviceList}>
          {list.map((session) => (
            <li key={session.id} className={styles.device}>
              <span className={styles.deviceIcon}>
                {session.client === "mobile" ? <Smartphone size={16} /> : <Monitor size={16} />}
              </span>
              <div>
                <strong>
                  {describeDevice(session)}
                  {session.current && <small className={styles.deviceCurrent}>This device</small>}
                </strong>
                <span>
                  Last active {new Date(session.lastUsedAt).toLocaleString()}
                </span>
              </div>
              {!session.current && (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={disabled || busy !== null}
                  onClick={() => void signOutOne(session.id)}
                >
                  {busy === session.id ? "Signing out…" : "Sign out"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={styles.dangerButton}
        disabled={disabled || busy !== null}
        onClick={() => void signOutEverywhere()}
      >
        <ShieldCheck size={16} />
        {busy === "all" ? "Signing out…" : "Sign out of all devices"}
      </button>
    </div>
  );
}
