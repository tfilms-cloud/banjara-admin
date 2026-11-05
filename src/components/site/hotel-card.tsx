import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { Hotel } from "@/types/customer/hotel";

type HotelCardProps = {
  hotel: Hotel;
  searchParams?: Record<string, string>;
};

export function HotelCard({ hotel, searchParams }: HotelCardProps) {
  const qs = searchParams ? `?${new URLSearchParams(searchParams).toString()}` : "";
  const image =
    hotel.images[0] ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";

  return (
    <Link
      href={`/hotels/${hotel.id}${qs}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={hotel.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {hotel.isVerified ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]">
            Verified
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{hotel.name}</h3>
            <p className="text-sm text-muted">
              {hotel.location.area || hotel.location.city}
              {hotel.location.city && hotel.location.area ? `, ${hotel.location.city}` : ""}
            </p>
          </div>
          {hotel.rating > 0 ? (
            <span className="shrink-0 rounded-lg bg-surface-secondary px-2 py-1 text-xs font-semibold">
              ★ {hotel.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3 pt-1">
          <p className="text-xs capitalize text-muted">{hotel.hotelType.replace("_", " ")}</p>
          <p className="text-right">
            <span className="font-display text-lg font-semibold">
              {formatCurrency(hotel.priceFrom)}
            </span>
            <span className="block text-xs text-muted">per night</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
