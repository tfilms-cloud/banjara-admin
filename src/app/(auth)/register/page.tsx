import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Compass, Clock3 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { authHref, safeNext } from "@/lib/auth-redirect";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Create account" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

/** Role choice, as on the mobile "Join Banjara" screen. */
export default async function RegisterPage({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      caption="Create account"
      title="Join BANJARA"
      subtitle="Choose how you’ll use BANJARA."
      footer={
        <>
          Already have an account? <Link href={authHref("/login", next)}>Sign in</Link>
        </>
      }
    >
      <div className={styles.roles}>
        <Link
          href={authHref("/register/traveller", next)}
          className={`${styles.role} ${styles.roleTraveller}`}
        >
          <span className={styles.roleIcon}>
            <Compass size={21} />
          </span>
          <div>
            <h3>
              I’m a traveller <span className={styles.badge}>Popular</span>
            </h3>
            <p>Search routes, pick seats, book stays and guides, and message local drivers.</p>
            <strong>Continue →</strong>
          </div>
        </Link>
        <Link href="/register/provider" className={`${styles.role} ${styles.roleProvider}`}>
          <span className={styles.roleIcon}>
            <BriefcaseBusiness size={21} />
          </span>
          <div>
            <h3>I’m a service provider</h3>
            <p>
              Drive your own vehicle, host a stay, run tours, guide or list a restaurant —
              then manage bookings and earnings.
            </p>
            <strong>Continue →</strong>
          </div>
        </Link>
        <p className={styles.note}>
          <Clock3 size={15} /> Takes about 2 minutes. No payment needed to start.
        </p>
      </div>
    </AuthShell>
  );
}
