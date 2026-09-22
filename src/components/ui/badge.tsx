import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
  {
    variants: {
      tone: {
        neutral: "border-slate-200 bg-slate-100 text-slate-700",
        navy: "border-navy/15 bg-navy/10 text-navy",
        info: "border-sky/20 bg-sky/10 text-sky",
        success: "border-green/20 bg-green/10 text-green",
        warning: "border-amber/25 bg-amber/10 text-[#B45309]",
        danger: "border-danger/20 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
