/** Shared labels for provider bookings (list and detail). */

export const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;

export function tripWhen(date: string, time: string) {
  if (!date) return "Date not set";
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime())
    ? `${date} ${time}`.trim()
    : parsed.toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function when(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export type Tone = "toneAmber" | "toneGreen" | "toneTeal" | "toneRed" | "toneGrey";

export function bookingStatus(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "pending":
      return { label: "Needs approval", tone: "toneAmber" };
    case "payment_verification":
      return { label: "Checking payment", tone: "toneAmber" };
    case "confirmed":
      return { label: "Confirmed", tone: "toneGreen" };
    case "completed":
      return { label: "Completed", tone: "toneTeal" };
    case "cancelled":
    case "rejected":
      return { label: "Cancelled", tone: "toneRed" };
    case "expired":
      return { label: "Expired", tone: "toneGrey" };
    case "refunded":
      return { label: "Refunded", tone: "toneGrey" };
    default:
      return { label: status || "—", tone: "toneGrey" };
  }
}

const METHOD: Record<string, string> = {
  cash: "Cash",
  bankTransfer: "Bank transfer",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  raast: "Raast",
  payAtHotel: "Pay at hotel",
};

/** Every payment status the backend uses, in plain words. */
const PAYMENT: Record<string, string> = {
  pending: "Unpaid",
  unpaid: "Unpaid",
  payment_initiated: "Payment started",
  proof_submitted: "Proof sent",
  under_review: "Checking payment",
  paid: "Paid",
  confirmed: "Paid",
  completed: "Paid",
  rejected: "Payment rejected",
  disputed: "Disputed",
  failed: "Payment failed",
  refunded: "Refunded",
  refund_pending: "Refund pending",
  expired: "Payment expired",
};

export function paymentLabel(status: string, method: string) {
  const how = METHOD[method] ?? method;
  const fallback = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "";
  const state = PAYMENT[status] ?? fallback;
  return [state, how].filter(Boolean).join(" · ");
}

export const methodLabel = (method: string) => METHOD[method] ?? method;
