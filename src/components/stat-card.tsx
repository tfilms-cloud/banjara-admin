import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "navy" | "sky" | "amber" | "green" | "danger";

const TONES: Record<StatTone, string> = {
  navy: "bg-navy/10 text-navy",
  sky: "bg-sky/10 text-sky",
  amber: "bg-amber/10 text-[#B45309]",
  green: "bg-green/10 text-green",
  danger: "bg-danger/10 text-danger",
};

export type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "navy",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="truncate text-2xl font-semibold text-navy">{value}</p>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              TONES[tone]
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );
}
