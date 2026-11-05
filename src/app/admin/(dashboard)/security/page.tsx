"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, KeyRound, Lock, LogOut, Monitor, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { errorMessage } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { del, get } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  confirmTwoFactor,
  getTwoFactorStatus,
  startTwoFactorSetup,
  turnOffTwoFactor,
} from "@/services/auth.service";
import { describeDevice, type DeviceSession } from "@/services/customer/session.service";

const STATUS_KEY = ["admin", "two-factor"];
const SESSIONS_KEY = ["admin", "sessions"];

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP", easier to type into a phone. */
const groupKey = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

export default function SecurityPage() {
  const { user } = useAuth();
  const required = Boolean(user?.twoFactorSetupRequired);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security"
        description="Protect your administrator account and see where it is signed in."
      />
      {required ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-navy">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
          <p>
            <strong>2-step verification is required for administrators.</strong> Set it up below to
            continue to the admin portal.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <TwoFactorCard />
        <SessionsCard />
      </div>
    </div>
  );
}

function TwoFactorCard() {
  const client = useQueryClient();
  const { refresh } = useAuth();
  const status = useQuery({ queryKey: STATUS_KEY, queryFn: getTwoFactorStatus });
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await startTwoFactorSetup());
    } catch (failure) {
      setError(errorMessage(failure, "Could not start setup."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await confirmTwoFactor(code);
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode("");
      toast.success("2-step verification is on.");
      await client.invalidateQueries({ queryKey: STATUS_KEY });
    } catch (failure) {
      setError(errorMessage(failure, "That code did not work."));
    } finally {
      setBusy(false);
    }
  };

  const finishRecovery = async () => {
    setRecoveryCodes(null);
    // Picks up twoFactorSetupRequired = false, which unlocks the rest of the portal.
    await refresh();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-sky" aria-hidden />
        <CardTitle>2-step verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {recoveryCodes ? (
          <RecoveryCodes codes={recoveryCodes} onDone={finishRecovery} />
        ) : status.isPending ? (
          <p className="text-muted">Loading…</p>
        ) : status.isError ? (
          <p className="text-danger">{errorMessage(status.error, "Could not load 2-step status.")}</p>
        ) : status.data.enabled ? (
          <>
            <p className="flex items-center gap-2 font-medium text-green">
              <ShieldCheck className="h-4 w-4" aria-hidden /> On since {formatDateTime(status.data.enabledAt)}
            </p>
            <p className="text-muted">
              Signing in needs your password and a code from your authenticator app.{" "}
              {status.data.recoveryCodesLeft} of 10 recovery codes left.
            </p>
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              Turn off 2-step verification
            </Button>
            <DisableForm
              open={disableOpen}
              onClose={() => setDisableOpen(false)}
              onDone={async () => {
                setDisableOpen(false);
                await client.invalidateQueries({ queryKey: STATUS_KEY });
                await refresh();
              }}
            />
          </>
        ) : setup ? (
          <form className="space-y-4" onSubmit={confirm}>
            <ol className="list-decimal space-y-2 pl-5 text-muted">
              <li>
                Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and
                add an account with a <strong className="text-foreground">setup key</strong>.
              </li>
              <li>Enter this key, as a time-based key:</li>
            </ol>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2">
              <code className="flex-1 break-all font-mono text-[13px] tracking-wider text-navy">
                {groupKey(setup.secret)}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(setup.secret);
                  toast.success("Key copied");
                }}
              >
                <Copy className="h-4 w-4" aria-hidden /> Copy
              </Button>
            </div>
            <p className="text-muted">
              On a phone, you can also{" "}
              <a className="text-sky underline-offset-4 hover:underline" href={setup.otpauthUrl}>
                open it in your authenticator app
              </a>
              .
            </p>
            <label className="block space-y-1.5">
              <span className="font-medium text-navy">3. Enter the 6-digit code the app shows</span>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                maxLength={7}
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {error ? <p className="text-danger" role="alert">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={busy} disabled={code.replace(/\s/g, "").length !== 6}>
                Turn on
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="flex items-center gap-2 font-medium text-amber">
              <ShieldAlert className="h-4 w-4" aria-hidden /> Off
            </p>
            <p className="text-muted">
              With 2-step verification, a stolen password is not enough to get into the admin
              portal: signing in also needs a code from your phone.
            </p>
            {error ? <p className="text-danger" role="alert">{error}</p> : null}
            <Button onClick={begin} loading={busy}>
              <Smartphone className="h-4 w-4" aria-hidden /> Set up 2-step verification
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = `BANJARA admin recovery codes\nEach code works once.\n\n${codes.join("\n")}\n`;
  return (
    <div className="space-y-4">
      <p className="font-medium text-navy">Save your recovery codes</p>
      <p className="text-muted">
        If you lose your phone, each of these codes signs you in once. They are shown only now:
        keep them somewhere safe, like a password manager.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-slate-50 p-3 font-mono text-[13px] tracking-wider text-navy">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(text);
            toast.success("Recovery codes copied");
          }}
        >
          <Copy className="h-4 w-4" aria-hidden /> Copy
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "banjara-recovery-codes.txt";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" aria-hidden /> Download
        </Button>
        <Button onClick={onDone}>I have saved them</Button>
      </div>
    </div>
  );
}

function DisableForm({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await turnOffTwoFactor(password, code);
      toast.success("2-step verification is off.");
      setPassword("");
      setCode("");
      await onDone();
    } catch (failure) {
      setError(errorMessage(failure, "Could not turn it off."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-3 rounded-lg border border-border p-4" onSubmit={submit}>
      <p className="font-medium text-navy">Confirm it is you</p>
      <Input
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        leftIcon={<Lock className="h-4 w-4" aria-hidden />}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        autoComplete="one-time-code"
        placeholder="Code from your app, or a recovery code"
        leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
        maxLength={12}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      {error ? <p className="text-danger" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" loading={busy} disabled={!password || code.trim().length < 6}>
          Turn off
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SessionsCard() {
  const client = useQueryClient();
  const { logoutEverywhere } = useAuth();
  const sessions = useQuery({ queryKey: SESSIONS_KEY, queryFn: () => get<DeviceSession[]>("/auth/sessions") });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const signOut = async (id: string) => {
    setBusy(id);
    try {
      await del(`/auth/sessions/${encodeURIComponent(id)}`);
      toast.success("That session was signed out.");
      await client.invalidateQueries({ queryKey: SESSIONS_KEY });
    } catch (failure) {
      toast.error(errorMessage(failure, "Could not sign out that session."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Monitor className="h-4 w-4 text-sky" aria-hidden />
        <CardTitle>Where you are signed in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {sessions.isPending ? (
          <p className="text-muted">Loading…</p>
        ) : sessions.isError ? (
          <p className="text-danger">{errorMessage(sessions.error, "Could not load sessions.")}</p>
        ) : (
          <ul className="space-y-2">
            {sessions.data.map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                {session.client === "mobile" ? (
                  <Smartphone className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                ) : (
                  <Monitor className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">
                    {describeDevice(session)}
                    {session.current ? (
                      <span className="ml-2 rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-medium text-sky">
                        This session
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    Last active {formatDateTime(session.lastUsedAt)}
                    {session.ip ? ` · ${session.ip}` : ""}
                  </p>
                </div>
                {!session.current ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busy === session.id}
                    disabled={busy !== null}
                    onClick={() => void signOut(session.id)}
                  >
                    Sign out
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Button variant="danger" onClick={() => setConfirmAll(true)}>
          <LogOut className="h-4 w-4" aria-hidden /> Sign out everywhere
        </Button>
        <ConfirmDialog
          open={confirmAll}
          title="Sign out everywhere?"
          description="Every session on every device ends, including this one. You will need to sign in again."
          confirmLabel="Sign out everywhere"
          tone="danger"
          loading={busy === "all"}
          onConfirm={async () => {
            setBusy("all");
            try {
              await logoutEverywhere();
            } finally {
              setBusy(null);
              setConfirmAll(false);
            }
          }}
          onClose={() => setConfirmAll(false)}
        />
      </CardContent>
    </Card>
  );
}
