import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** The API (and its Socket.io endpoint) lives on another origin; allow only that one. */
function apiOrigins(): string[] {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api");
    const ws = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${ws}//${url.host}`];
  } catch {
    return [];
  }
}

// No nonces: Next's inline bootstrap scripts need 'unsafe-inline' (see the bundled
// docs, guides/content-security-policy.md). The strict parts are where code and
// connections may come from, and who may frame us.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigins().join(" ")}`,
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/trips", destination: "/explore?service=transport", permanent: false },
      { source: "/hotels", destination: "/explore?service=hotels", permanent: false },
      { source: "/hotels/results", destination: "/explore?service=hotels", permanent: false },
      { source: "/account/bookings/:id", destination: "/account/bookings?booking=:id", permanent: false },
    ];
  },
};

export default nextConfig;
