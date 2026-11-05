import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { authHref, safeNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Reset password" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      caption="Account help"
      title="Reset password"
      subtitle="Enter your email and we’ll send a code to get you back in."
      backHref={authHref("/login", next)}
      backLabel="Back to sign in"
      footer={
        <>
          Remembered it? <Link href={authHref("/login", next)}>Sign in</Link>
        </>
      }
    >
      <ForgotPasswordForm next={next} />
    </AuthShell>
  );
}
