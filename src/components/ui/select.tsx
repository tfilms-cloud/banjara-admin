"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options?: SelectOption[];
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, invalid = false, children, ...props },
  ref
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border bg-card px-3 pr-9 text-sm text-foreground shadow-sm outline-none transition",
          "focus:border-sky focus:ring-2 focus:ring-sky/20",
          invalid ? "border-danger" : "border-border",
          className
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
});
