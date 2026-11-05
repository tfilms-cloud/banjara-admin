"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminEntryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/admin/dashboard" : "/admin/login");
  }, [loading, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <LoaderCircle className="h-6 w-6 animate-spin text-sky" aria-label="Loading" />
    </div>
  );
}
