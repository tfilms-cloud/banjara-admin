import {
  BadgeCheck,
  BedDouble,
  Bell,
  Building2,
  Bus,
  CalendarClock,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Route,
  Settings,
  Star,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Partners",
    items: [
      {
        label: "Provider Applications",
        href: "/admin/providers/applications",
        icon: ClipboardList,
      },
      { label: "Providers", href: "/admin/providers", icon: BadgeCheck },
    ],
  },
  {
    label: "People",
    items: [{ label: "Customers", href: "/admin/customers", icon: Users }],
  },
  {
    label: "Transport",
    items: [
      { label: "Vehicles", href: "/admin/transport/vehicles", icon: Bus },
      { label: "Routes", href: "/admin/transport/routes", icon: Route },
      { label: "Pickup Points", href: "/admin/transport/pickup-points", icon: MapPin },
      { label: "Trips", href: "/admin/transport/trips", icon: CalendarClock },
    ],
  },
  {
    label: "Stays",
    items: [
      { label: "Hotels", href: "/admin/hotels", icon: Building2 },
      { label: "Rooms", href: "/admin/hotels/rooms", icon: BedDouble },
      { label: "Availability", href: "/admin/hotels/availability", icon: CalendarRange },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: Ticket },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
      { label: "Reports", href: "/admin/reports", icon: ChartColumn },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Returns the deepest nav href that matches the current pathname. */
export function activeNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of NAV_ITEMS) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

export function pageTitleFromPath(pathname: string): string {
  const active = activeNavHref(pathname);
  const match = NAV_ITEMS.find((item) => item.href === active);
  if (match) {
    const isDetail = pathname !== match.href;
    return isDetail ? `${match.label} · Details` : match.label;
  }
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "Admin";
  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
