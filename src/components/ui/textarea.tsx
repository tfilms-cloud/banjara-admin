"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-slate-400",
        "focus:border-sky focus:ring-2 focus:ring-sky/20",
        invalid ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border",
        className
      )}
      {...props}
    />
  );
});
