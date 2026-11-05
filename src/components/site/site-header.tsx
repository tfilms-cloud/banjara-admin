"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import styles from "./site-header.module.css";

const NAVIGATION = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account", label: "Profile" },
] as const;

function activeTab(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/explore")
    return ["/explore", "/trips", "/hotels", "/agencies", "/tours", "/restaurants", "/guides"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  if (href === "/account")
    return (
      pathname === "/account" ||
      (pathname.startsWith("/account/") &&
        !pathname.startsWith("/account/bookings") &&
        !pathname.startsWith("/account/messages"))
    );
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** One customer-site header, mounted by the shared (site) layout on every route. */
export function SiteHeader() {
  const pathname = usePathname();
  return <CustomerHeader key={pathname} pathname={pathname} />;
}

function CustomerHeader({ pathname }: { pathname: string }) {
  const { user, isAuthenticated, loading, logout } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const links = NAVIGATION.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={activeTab(pathname, item.href) ? "page" : undefined}
      onClick={() => setOpen(false)}
    >
      {item.label}
    </Link>
  ));

  return (
    <header ref={header} className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="BANJARA home"
          onClick={() => setOpen(false)}
        >
          <BrandLogo size={38} />
          <span>BANJARA</span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary">
          {links}
        </nav>
        <div className={styles.actions}>
          <Link
            className={styles.partner}
            href={!isAuthenticated ? "/register" : user?.role === "provider" ? "/provider" : "/account"}
            onClick={() => setOpen(false)}
          >
            {isAuthenticated
              ? user?.name?.split(" ")[0] || "Account"
              : "Join BANJARA"}
            <ArrowUpRight size={15} />
          </Link>
          <Link
            href={!isAuthenticated ? "/login" : user?.role === "provider" ? "/provider" : "/account"}
            className={styles.account}
            aria-label={isAuthenticated ? "My account" : "Sign in"}
            onClick={() => setOpen(false)}
          >
            <UserRound size={19} />
          </Link>
          <button
            ref={menuButton}
            className={styles.menuButton}
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="site-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="site-navigation"
          className={styles.mobileNav}
          aria-label="Account and navigation"
        >
          {links}
          {isAuthenticated ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                void logout();
              }}
            >
              Sign out
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                Create account
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
