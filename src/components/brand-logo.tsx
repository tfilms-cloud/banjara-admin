import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 36, className }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/banjara-logo.png"
      alt="BANJARA"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full bg-black object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
