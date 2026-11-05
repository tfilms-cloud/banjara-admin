"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Compass, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/components/error-state";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading, login, verifyCode } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set once the password was right and a 2-step code is needed. */
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      router.replace(user.twoFactorSetupRequired ? "/admin/security" : "/admin/dashboard");
    }
  }, [loading, user, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.kind === "code-required") {
        setMfaToken(result.mfaToken);
        return;
      }
      toast.success(`Welcome back, ${result.user.name || "Administrator"}.`);
      router.replace(result.user.twoFactorSetupRequired ? "/admin/security" : "/admin/dashboard");
    } catch (error) {
      const message = errorMessage(error, "Unable to sign in. Please try again.");
      setFormError(message);
      toast.error(message);
    }
  });

  const onSubmitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!mfaToken) return;
    setFormError(null);
    setVerifying(true);
    try {
      const authenticated = await verifyCode(mfaToken, code);
      toast.success(`Welcome back, ${authenticated.name || "Administrator"}.`);
      router.replace("/admin/dashboard");
    } catch (error) {
      const message = errorMessage(error, "That code did not work. Please try again.");
      setFormError(message);
      // The step token lasts 5 minutes; after that, start again from the password.
      if (/took too long|password again/i.test(message)) {
        setMfaToken(null);
        setCode("");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:w-[45%] lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber text-navy">
            <Compass className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">BANJARA</p>
            <p className="text-[11px] text-slate-300">Admin Portal</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            One console for every BANJARA journey.
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            Approve providers, monitor trips and stays, reconcile payments and keep travellers
            supported — all from a single operations workspace.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Restricted access · administrators only
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-amber">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-navy">BANJARA</p>
              <p className="text-xs text-muted">Admin Portal</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {mfaToken ? (
              <>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-navy">
                    2-step verification
                  </h1>
                  <p className="text-sm text-muted">
                    Enter the 6-digit code from your authenticator app. Lost your phone? Use one
                    of your recovery codes instead.
                  </p>
                </div>
                <form className="mt-6 space-y-4" onSubmit={onSubmitCode} noValidate>
                  <div className="space-y-1.5">
                    <label htmlFor="code" className="text-sm font-medium text-navy">
                      Code
                    </label>
                    <Input
                      key="mfa-code"
                      id="code"
                      inputMode="text"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="123 456"
                      maxLength={12}
                      leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </div>
                  {formError ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger"
                    >
                      {formError}
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={verifying}
                    disabled={code.trim().length < 6}
                  >
                    {verifying ? "Checking…" : "Verify and sign in"}
                  </Button>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 text-sm text-muted hover:text-foreground"
                    onClick={() => {
                      setMfaToken(null);
                      setCode("");
                      setFormError(null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden /> Use a different account
                  </button>
                </form>
              </>
            ) : (
              <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-navy">Sign in</h1>
              <p className="text-sm text-muted">
                Use your BANJARA administrator credentials to continue.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-navy">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@BANJARA.pk"
                  leftIcon={<Mail className="h-4 w-4" aria-hidden />}
                  invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-danger">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-navy">
                  Password
                </label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" aria-hidden />}
                  invalid={Boolean(errors.password)}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="rounded p-1.5 text-muted transition hover:bg-slate-100 hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  }
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-danger">{errors.password.message}</p>
                ) : null}
              </div>

              {formError ? (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {formError}
                </div>
              ) : null}

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            BANJARA Admin · access is limited to accounts with the administrator role.
          </p>
        </div>
      </main>
    </div>
  );
}
