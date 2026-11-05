import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAccess } from "@/components/site/account-access";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteMain } from "@/components/site/site-main";
import styles from "@/components/site/site-shell.module.css";

export const metadata: Metadata = {
  title: {
    default: "BANJARA — Travel the north",
    template: "%s · BANJARA",
  },
  description:
    "Book vans, buses, private trips, and stays across Hunza, Skardu, Gilgit and more.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${styles.shell} flex min-h-full flex-1 flex-col bg-background text-foreground`}
    >
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
      <SiteFooter />
      <Suspense fallback={null}><AccountAccess /></Suspense>
    </div>
  );
}
