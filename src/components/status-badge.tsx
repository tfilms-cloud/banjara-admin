import { Badge, type BadgeTone } from "@/components/ui/badge";

type StatusMeta = { tone: BadgeTone; label: string };

const STATUS_MAP: Record<string, StatusMeta> = {
  pending: { tone: "warning", label: "Pending" },
  pendingreview: { tone: "warning", label: "Pending Review" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  suspended: { tone: "neutral", label: "Suspended" },
  verified: { tone: "success", label: "Verified" },
  unverified: { tone: "neutral", label: "Unverified" },

  confirmed: { tone: "success", label: "Confirmed" },
  cancelled: { tone: "danger", label: "Cancelled" },
  canceled: { tone: "danger", label: "Cancelled" },
  completed: { tone: "success", label: "Completed" },
  upcoming: { tone: "info", label: "Upcoming" },
  ongoing: { tone: "info", label: "Ongoing" },
  scheduled: { tone: "info", label: "Scheduled" },
  nownow: { tone: "info", label: "Live" },
  expired: { tone: "neutral", label: "Expired" },
  checkedin: { tone: "info", label: "Checked In" },
  checkedout: { tone: "neutral", label: "Checked Out" },
  noshow: { tone: "danger", label: "No Show" },

  paid: { tone: "success", label: "Paid" },
  unpaid: { tone: "warning", label: "Unpaid" },
  failed: { tone: "danger", label: "Failed" },
  refunded: { tone: "info", label: "Refunded" },
  partiallyrefunded: { tone: "info", label: "Partly Refunded" },
  processing: { tone: "info", label: "Processing" },
  partial: { tone: "warning", label: "Partial" },

  open: { tone: "info", label: "Open" },
  inprogress: { tone: "info", label: "In Progress" },
  resolved: { tone: "success", label: "Resolved" },
  closed: { tone: "neutral", label: "Closed" },

  active: { tone: "success", label: "Active" },
  inactive: { tone: "neutral", label: "Inactive" },
  blocked: { tone: "danger", label: "Blocked" },
  available: { tone: "success", label: "Available" },
  booked: { tone: "info", label: "Booked" },
  occupied: { tone: "warning", label: "Occupied" },
  maintenance: { tone: "warning", label: "Maintenance" },
  full: { tone: "danger", label: "Full" },

  low: { tone: "neutral", label: "Low" },
  medium: { tone: "warning", label: "Medium" },
  high: { tone: "danger", label: "High" },

  transport: { tone: "info", label: "Transport" },
  hotel: { tone: "navy", label: "Hotel" },
  package: { tone: "navy", label: "Package" },
};

function normalize(status: string) {
  return status.toLowerCase().replace(/[\s_-]/g, "");
}

function fallbackLabel(status: string) {
  const spaced = status.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function statusMeta(status?: string | null): StatusMeta {
  if (!status) return { tone: "neutral", label: "—" };
  return STATUS_MAP[normalize(status)] ?? { tone: "neutral", label: fallbackLabel(status) };
}

export function StatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const meta = statusMeta(status);
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
