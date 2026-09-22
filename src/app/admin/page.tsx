"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { getStoredAccessToken } from "@/lib/api";

export default function AdminEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getStoredAccessToken() ? "/admin/dashboard" : "/admin/login");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <LoaderCircle className="h-6 w-6 animate-spin text-sky" aria-label="Loading" />
    </div>
  );
}
