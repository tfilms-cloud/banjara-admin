import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { authHref, safeNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      caption="Sign in"
      title="Welcome back"
      subtitle="Use the email and password for your BANJARA account. Travellers and service providers sign in here."
      footer={
        <>
          New to BANJARA? <Link href={authHref("/register", next)}>Create account</Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
