import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Why travelers choose BANJARA
        </p>
        <ul className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Verified providers", "Look for verified badges on approved provider profiles before you book."],
            ["Your bookings, together", "Keep your trip details and booking status in one convenient place."],
            ["Local connections", "Find provider contact details and get help planning your journey."],
            ["Clear prices", "Compare published fares, vehicle details, and seats before choosing your ride."],
          ].map(([title, body]) => (
            <li key={title}>
              <strong className="block">{title}</strong>
              <span className="text-muted">{body}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={32} />
            <span className="font-display text-base font-semibold tracking-wide">BANJARA</span>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Your Journey. Your Seat. Your Way. Book vans, buses, and stays across northern
            Pakistan — in one place.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Explore</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore?service=transport" className="hover:text-[var(--color-primary)]">
                Transport & trips
              </Link>
            </li>
            <li>
              <Link href="/explore?service=hotels" className="hover:text-[var(--color-primary)]">
                Hotels & stays
              </Link>
            </li>
            <li>
              <Link href="/account/bookings" className="hover:text-[var(--color-primary)]">
                My bookings
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Account</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/account?auth=signin" className="hover:text-[var(--color-primary)]">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/account?auth=register" className="hover:text-[var(--color-primary)]">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/account" className="text-muted hover:text-foreground">
                My profile
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} BANJARA. Travel the north with confidence.
      </div>
    </footer>
  );
}
