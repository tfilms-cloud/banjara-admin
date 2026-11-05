import { customerDel, customerGet, customerPost } from "@/lib/customer-api";

export type DeviceSession = {
  id: string;
  client: "web-admin" | "web-site" | "mobile";
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  /** The device you are using right now. */
  current: boolean;
};

export function listDeviceSessions() {
  return customerGet<DeviceSession[]>("/auth/sessions");
}

export function signOutDevice(id: string) {
  return customerDel<{ id: string; current: boolean }>(`/auth/sessions/${encodeURIComponent(id)}`);
}

export function signOutAllDevices() {
  return customerPost<{ revoked: number }>("/auth/logout-all");
}

/** "Chrome on Windows", "BANJARA app", … from what the session recorded. */
export function describeDevice(session: Pick<DeviceSession, "client" | "userAgent">): string {
  if (session.client === "mobile") return "BANJARA app";
  const ua = session.userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const where = session.client === "web-admin" ? " (admin portal)" : "";
  return `${browser}${os ? ` on ${os}` : ""}${where}`;
}
