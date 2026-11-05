"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { newPasswordSchema, PASSWORD_HINT } from "@/lib/password-rule";
import {
  ArrowRight,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { authHref, homeAfterAuth } from "@/lib/auth-redirect";
import {
  forgotCustomerPassword,
  resetCustomerPassword,
} from "@/services/customer/auth.service";
import { AuthBanner, AuthField } from "./auth-fields";
import styles from "./auth.module.css";

const message = (reason: unknown, fallback: string) =>
  reason instanceof Error && reason.message ? reason.message : fallback;

/** Sends someone who is already signed in straight on, as the mobile app does. */
function useRedirectIfSignedIn(next?: string | null) {
  const router = useRouter();
  const { user, loading } = useCustomerAuth();
  useEffect(() => {
    if (!loading && user) router.replace(homeAfterAuth(user, next));
  }, [loading, user, next, router]);
}

function Spinner() {
  return <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Sign in                                                             */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export function LoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const auth = useCustomerAuth();
  const [error, setError] = useState("");
  useRedirectIfSignedIn(next);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError("");
    try {
      const user = await auth.login(email, password);
      router.replace(homeAfterAuth(user, next));
    } catch (reason) {
      setError(message(reason, "Unable to sign in. Please try again."));
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error ? <AuthBanner>{error}</AuthBanner> : null}
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        error={formState.errors.email?.message}
        {...register("email")}
      />
      <AuthField
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        error={formState.errors.password?.message}
        aside={
          <Link href={authHref("/forgot-password", next)} className={styles.link}>
            Forgot password?
          </Link>
        }
        {...register("password")}
      />
      <button type="submit" className={styles.primary} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Spinner /> : <ShieldCheck size={16} />}
        {formState.isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Create account (traveller or provider)                             */
/* ------------------------------------------------------------------ */

const accountFields = {
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, "")),
      "Enter a valid phone number",
    ),
  password: newPasswordSchema,
  confirmPassword: z.string(),
};

const travellerSchema = z
  .object(accountFields)
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const providerSchema = z
  .object({
    ...accountFields,
    terms: z.boolean().refine((value) => value, "Accept the terms to continue"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AccountValues = z.infer<typeof providerSchema>;

export function RegisterForm({
  role,
  next,
}: {
  role: "customer" | "provider";
  next?: string | null;
}) {
  const router = useRouter();
  const auth = useCustomerAuth();
  const [error, setError] = useState("");
  const isProvider = role === "provider";
  useRedirectIfSignedIn(next);
  const { register, handleSubmit, formState } = useForm<AccountValues>({
    // The traveller form has no terms box, so it validates without that field.
    resolver: zodResolver((isProvider ? providerSchema : travellerSchema) as typeof providerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit(async ({ name, email, phone, password }) => {
    setError("");
    try {
      const user = await auth.register({ name, email, phone, password, role });
      router.replace(homeAfterAuth(user, next));
    } catch (reason) {
      setError(message(reason, "Unable to create your account. Please try again."));
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error ? <AuthBanner>{error}</AuthBanner> : null}
      <AuthField
        label="Full name"
        icon={UserRound}
        autoComplete="name"
        placeholder="e.g. Ayesha Khan"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className={styles.row2}>
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          label="Phone"
          icon={Phone}
          type="tel"
          autoComplete="tel"
          placeholder="03XX XXXXXXX"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <AuthField
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        placeholder={PASSWORD_HINT}
        hint="Use a mix of letters and numbers for a stronger password."
        error={errors.password?.message}
        {...register("password")}
      />
      <AuthField
        label="Confirm password"
        icon={ShieldCheck}
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {isProvider ? (
        <div className={styles.field}>
          <label className={styles.check}>
            <input type="checkbox" {...register("terms")} />
            <span>I agree to the BANJARA Terms &amp; Conditions for service providers.</span>
          </label>
          {errors.terms?.message ? (
            <span className={styles.error}>{errors.terms.message}</span>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className={styles.primary} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Spinner /> : null}
        {formState.isSubmitting
          ? "Creating account…"
          : isProvider
            ? "Create provider account"
            : "Create account"}
        {formState.isSubmitting ? null : <ArrowRight size={16} />}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password: request a code, then set a new password           */
/* ------------------------------------------------------------------ */

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email") });
const resetSchema = z
  .object({
    code: z.string().trim().min(4, "Enter the code from your email"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function ForgotPasswordForm({ next }: { next?: string | null }) {
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className={styles.form}>
        <AuthBanner tone="success">
          Your password has been updated. Sign in with your new password.
        </AuthBanner>
        <Link href={authHref("/login", next)} className={styles.primary}>
          Back to sign in <ArrowRight size={16} />
        </Link>
      </div>
    );
  }
  return email ? (
    <ResetStep
      email={email}
      sentMessage={sentMessage}
      onChangeEmail={() => setEmail("")}
      onDone={() => setDone(true)}
    />
  ) : (
    <RequestStep
      onSent={(address, text) => {
        setEmail(address);
        setSentMessage(text);
      }}
    />
  );
}

function RequestStep({ onSent }: { onSent: (email: string, message: string) => void }) {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const onSubmit = handleSubmit(async ({ email }) => {
    setError("");
    try {
      const result = await forgotCustomerPassword(email);
      onSent(email, result?.message || "");
    } catch (reason) {
      setError(message(reason, "Unable to send reset code"));
    }
  });
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error ? <AuthBanner>{error}</AuthBanner> : null}
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        error={formState.errors.email?.message}
        {...register("email")}
      />
      <button type="submit" className={styles.primary} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Spinner /> : <Mail size={16} />}
        {formState.isSubmitting ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}

function ResetStep({
  email,
  sentMessage,
  onChangeEmail,
  onDone,
}: {
  email: string;
  sentMessage: string;
  onChangeEmail: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [resent, setResent] = useState("");
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });
  const onSubmit = handleSubmit(async ({ code, newPassword }) => {
    setError("");
    try {
      await resetCustomerPassword({ email, code, newPassword });
      onDone();
    } catch (reason) {
      setError(message(reason, "Unable to reset your password. Please try again."));
    }
  });
  const resend = async () => {
    setError("");
    setResent("");
    try {
      await forgotCustomerPassword(email);
      setResent("A new code is on its way.");
    } catch (reason) {
      setError(message(reason, "Unable to send reset code"));
    }
  };
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <AuthBanner tone="success">
        {resent ||
          sentMessage ||
          `Check ${email} for your reset code, then set a new password below.`}{" "}
        <button type="button" className={styles.link} onClick={onChangeEmail}>
          Use a different email
        </button>
      </AuthBanner>
      {error ? <AuthBanner>{error}</AuthBanner> : null}
      <AuthField
        label="Reset code"
        icon={KeyRound}
        autoComplete="one-time-code"
        placeholder="Paste the code from your email"
        error={formState.errors.code?.message}
        {...register("code")}
      />
      <AuthField
        label="New password"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        placeholder={PASSWORD_HINT}
        error={formState.errors.newPassword?.message}
        {...register("newPassword")}
      />
      <AuthField
        label="Confirm new password"
        icon={ShieldCheck}
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
        error={formState.errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <button type="submit" className={styles.primary} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Spinner /> : <ShieldCheck size={16} />}
        {formState.isSubmitting ? "Updating…" : "Set new password"}
      </button>
      <button type="button" className={styles.secondary} onClick={() => void resend()}>
        Resend code
      </button>
    </form>
  );
}
