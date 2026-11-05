"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CustomerAuthProvider } from "@/components/providers/customer-auth-provider";
import { makeQueryClient } from "@/lib/query-client";
import { BackendAvailabilityGate } from "@/components/providers/backend-availability-gate";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BackendAvailabilityGate>
        <CustomerAuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ style: { borderRadius: "0.75rem" } }}
          />
        </CustomerAuthProvider>
      </BackendAvailabilityGate>
    </QueryClientProvider>
  );
}
