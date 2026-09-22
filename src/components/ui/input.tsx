"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, leftIcon, rightSlot, ...props },
  ref
) {
  return (
    <div className="relative w-full">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-slate-400",
          "focus:border-sky focus:ring-2 focus:ring-sky/20",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted",
          invalid ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border",
          leftIcon ? "pl-9" : undefined,
          rightSlot ? "pr-10" : undefined,
          className
        )}
        {...props}
      />
      {rightSlot ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{rightSlot}</span>
      ) : null}
    </div>
  );
});
