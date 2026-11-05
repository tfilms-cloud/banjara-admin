"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff, Info, type LucideIcon } from "lucide-react";
import styles from "./auth.module.css";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
  /** Extra content on the label row, such as "Forgot password?". */
  aside?: ReactNode;
};

/** Labelled input with a leading icon, matching the mobile Input component. */
export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { label, icon: Icon, error, hint, aside, className, type = "text", ...input },
  ref,
) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {aside}
      </div>
      <div className={styles.control}>
        <Icon size={17} />
        <input
          ref={ref}
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            styles.input,
            error ? styles.inputError : "",
            isPassword ? styles.withToggle : "",
            className ?? "",
          ].join(" ")}
          {...input}
        />
        {isPassword ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShown((value) => !value)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
          >
            {shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});

/** Error or success message above a form, like the mobile AuthErrorBanner. */
export function AuthBanner({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlert : tone === "info" ? Info : CircleCheck;
  return (
    <div
      className={`${styles.banner} ${tone === "success" ? styles.bannerOk : tone === "info" ? styles.bannerInfo : ""}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={17} />
      <span>{children}</span>
    </div>
  );
}
