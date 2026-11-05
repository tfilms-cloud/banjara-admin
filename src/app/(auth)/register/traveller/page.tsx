import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";
import { authHref, safeNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Create traveller account" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function TravellerRegisterPage({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      caption="Traveller"
      title="Create traveller account"
      subtitle="Book rides, stays and guides with one BANJARA profile."
      backHref={authHref("/register", next)}
      backLabel="Change account type"
      footer={
        <>
          Already have an account? <Link href={authHref("/login", next)}>Sign in</Link>
        </>
      }
    >
      <RegisterForm role="customer" next={next} />
    </AuthShell>
  );
}
