"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { pageTitleFromPath } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export type AdminHeaderProps = {
  onMenuClick: () => void;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "BA";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-navy transition hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy sm:text-base">
          {pageTitleFromPath(pathname)}
        </p>
        <p className="hidden text-xs text-muted sm:block">BANJARA platform administration</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-navy">{user?.name || "Administrator"}</p>
          <p className="text-xs capitalize text-muted">{user?.role ?? "admin"}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {initialsOf(user?.name ?? "BANJARA Admin")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out of BANJARA Admin?"
        description="You will need to sign in again to manage the platform."
        confirmLabel="Sign out"
        tone="danger"
        loading={loggingOut}
        onConfirm={handleLogout}
        onClose={() => setConfirmLogout(false)}
      />
    </header>
  );
}
