import type { Metadata } from "next";
import { Geist_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BANJARA",
    template: "%s · BANJARA",
  },
  description:
    "Book vans, buses, private trips, and stays across northern Pakistan.",
  icons: {
    icon: "/banjara-logo.png",
    apple: "/banjara-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
