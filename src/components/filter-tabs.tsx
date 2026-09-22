"use client";

import { cn } from "@/lib/utils";

export type FilterTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export type FilterTabsProps<T extends string> = {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Filter records"
      className={cn(
        "flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-sm sm:w-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-navy text-white shadow-sm" : "text-muted hover:bg-slate-100"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] leading-4",
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-muted"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
