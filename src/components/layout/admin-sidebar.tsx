"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LogOut, PanelLeftClose, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NAV_GROUPS, activeNavHref } from "@/components/layout/nav-config";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function AdminSidebar({ open, onClose, collapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const activeHref = activeNavHref(pathname);
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
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-navy/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-sidebar text-sidebar-fg transition-[width,transform] duration-200",
          collapsed ? "w-[76px]" : "w-[260px]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        aria-label="BANJARA admin navigation"
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-4",
            collapsed ? "justify-center px-0" : undefined
          )}
        >
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 overflow-hidden"
            onClick={onClose}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber text-navy shadow-sm">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            {collapsed ? null : (
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide text-white">BANJARA</span>
                <span className="text-[11px] text-sidebar-muted">Admin Portal</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1.5 text-sidebar-muted transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {collapsed ? (
                <div className="mx-3 my-2 h-px bg-white/5" />
              ) : (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = activeHref === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      collapsed ? "justify-center px-0" : undefined,
                      isActive
                        ? "bg-sidebar-active/15 font-medium text-white"
                        : "text-sidebar-muted hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive ? (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-amber" />
                    ) : null}
                    <Icon
                      className={cn("h-4 w-4 shrink-0", isActive ? "text-sky" : undefined)}
                      aria-hidden
                    />
                    {collapsed ? null : <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-danger/15 hover:text-white",
              collapsed ? "justify-center px-0" : undefined
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {collapsed ? null : <span>Logout</span>}
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white lg:flex",
              collapsed ? "justify-center px-0" : undefined
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose
              className={cn("h-4 w-4 shrink-0 transition-transform", collapsed && "rotate-180")}
              aria-hidden
            />
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      </aside>

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
    </>
  );
}
