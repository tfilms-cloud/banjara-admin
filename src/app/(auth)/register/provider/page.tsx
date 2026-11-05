import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Become a service provider" };

export default function ProviderRegisterPage() {
  return (
    <AuthShell
      caption="Service provider · Step 1"
      title="Become a BANJARA service provider"
      step={{ current: 1, total: 8 }}
      subtitle="Create your account, then choose your service and add your details, photos and CNIC."
      backHref="/register"
      backLabel="Change account type"
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <RegisterForm role="provider" />
    </AuthShell>
  );
}
