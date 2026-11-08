"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  Bell,
  CalendarRange,
  CalendarCheck,
  CarFront,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Route,
  Settings,
  Star,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { useQuery } from "@/lib/live-query";
import { getProviderApplication } from "@/services/customer/auth.service";
import { intercityConfigQuery } from "@/services/customer/intercity.service";
import styles from "./provider-shell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Usable before approval (everything else waits for BANJARA's review). */
  open?: boolean;
};

/** Same sections as the app's provider side (tabs plus the "more" screens). */
function navFor(isDriver: boolean, isHost: boolean, intercity: boolean): Array<{ title: string; items: NavItem[] }> {
  return [
    {
      title: "Main",
      items: [
        { href: "/provider", label: "Dashboard", icon: LayoutDashboard, open: true },
        ...(isHost
          ? [
              { href: "/provider/rooms", label: "My rooms", icon: BedDouble },
              { href: "/provider/availability", label: "Availability", icon: CalendarRange },
            ]
          : [{ href: "/provider/trips", label: isDriver ? "My trips" : "My service", icon: CarFront }]),
        ...(intercity ? [{ href: "/provider/intercity", label: "City to City", icon: Route }] : []),
        { href: "/provider/bookings", label: "Bookings", icon: CalendarCheck },
        { href: "/provider/earnings", label: "Earnings", icon: Wallet },
      ],
    },
    {
      title: "Travellers",
      items: [
        { href: "/provider/messages", label: "Messages", icon: MessageSquare },
        { href: "/provider/reviews", label: "Reviews", icon: Star },
        { href: "/provider/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/provider/payments", label: "Payments & top-up", icon: CreditCard },
        { href: "/provider/profile", label: "Profile", icon: UserRound },
        { href: "/provider/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

const TITLES: Record<string, string> = {
  "/provider": "Dashboard",
  "/provider/trips": "My trips",
  "/provider/rooms": "My rooms",
  "/provider/intercity": "City to City",
  "/provider/availability": "Availability",
  "/provider/bookings": "Bookings",
  "/provider/earnings": "Earnings",
  "/provider/messages": "Messages",
  "/provider/reviews": "Reviews",
  "/provider/notifications": "Notifications",
  "/provider/payments": "Payments & top-up",
  "/provider/profile": "Profile",
  "/provider/settings": "Settings",
};

/** Layout for the provider area: sidebar navigation like the app, top bar, phone drawer. */
export function ProviderShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const isProvider = user?.role === "provider";

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isProvider) router.replace("/account");
  }, [loading, user, isProvider, router]);

  const application = useQuery({
    queryKey: ["provider", "application", user?.id],
    queryFn: getProviderApplication,
    enabled: isProvider,
  });
  const data = application.data;
  const approved = data?.verificationStatus === "approved";
  const isHost = Boolean(data?.services?.includes("hotel"));
  const isDriver = !isHost && (data?.services?.includes("transport") ?? true);
  // City to City is for drivers, and only once BANJARA switches it on.
  const intercityConfig = useQuery({ ...intercityConfigQuery, enabled: isProvider });
  const showIntercity = Boolean(data?.services?.includes("transport")) && !isHost && intercityConfig.data?.enabled === true;
  const groups = navFor(isDriver, isHost, showIntercity);

  // Close the phone drawer after navigating, and with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const title =
    TITLES[pathname] ??
    (pathname === "/provider/trips/new"
      ? "Create trip"
      : pathname.startsWith("/provider/trips/")
        ? "Edit trip"
        : pathname.startsWith("/provider/bookings/")
          ? "Booking details"
          : "Provider");
  const firstName = user?.name?.split(" ")[0] || "Provider";

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} aria-label="Provider navigation">
        <div className={styles.brandRow}>
          <Link href="/provider" className={styles.brand} onClick={() => setOpen(false)}>
            <BrandLogo size={34} />
            <span>
              BANJARA
              <small>{isHost ? "Host" : isDriver ? "Driver" : "Provider"}</small>
            </span>
          </Link>
          <button type="button" className={styles.closeDrawer} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {groups.map((group) => (
            <div key={group.title} className={styles.group}>
              <p className={styles.groupTitle}>{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/provider" ? pathname === "/provider" : pathname.startsWith(item.href);
                // Every section can be viewed; actions inside wait for approval.
                const locked = false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`${styles.link} ${active ? styles.linkActive : ""} ${locked ? styles.linkLocked : ""}`}
                    aria-current={active ? "page" : undefined}
                    title={locked ? "Available after your application is approved" : undefined}
                  >
                    <Icon size={18} />
                    <span>{item.href === "/provider" && !approved ? "Your application" : item.label}</span>
                    {locked ? <Lock size={13} className={styles.lockIcon} aria-label="Locked" /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userCard}>
            <span className={styles.avatar}>{firstName.charAt(0).toUpperCase()}</span>
            <span className={styles.userText}>
              <strong>{user?.name ?? "Provider"}</strong>
              <small>
                {approved ? "Approved" : data ? "Application pending" : "Getting started"}
              </small>
            </span>
          </div>
          <button type="button" className={styles.signOut} onClick={() => void logout()}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open ? <button type="button" className={styles.scrim} aria-label="Close menu" onClick={() => setOpen(false)} /> : null}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className={styles.title}>{pathname === "/provider" && !approved ? "Your application" : title}</h1>
          <div className={styles.topActions}>
            <Link href="/provider/notifications" className={styles.iconButton} aria-label="Notifications">
              <Bell size={18} />
            </Link>
            <Link href="/" className={styles.siteLink}>
              View site <ExternalLink size={14} />
            </Link>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
