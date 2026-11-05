"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Compass, LoaderCircle } from "lucide-react";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pathname = usePathname();
  const authorized = Boolean(user && user.role === "admin");
  // The API refuses admin requests until 2-step verification is on (when required),
  // so go straight to the page that sets it up.
  const mustSetUpTwoFactor = Boolean(user?.twoFactorSetupRequired) && pathname !== "/admin/security";

  useEffect(() => {
    if (loading) return;
    if (!authorized) {
      router.replace("/admin/login");
    } else if (mustSetUpTwoFactor) {
      router.replace("/admin/security");
    }
  }, [loading, authorized, mustSetUpTwoFactor, router]);

  if (loading || !authorized || mustSetUpTwoFactor) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-navy text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber text-navy">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Preparing your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 bg-background">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((previous) => !previous)}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"
        )}
      >
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
