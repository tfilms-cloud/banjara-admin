import {
  clearCustomerSession,
  customerGet,
  customerPost,
  persistCustomerSession,
} from "@/lib/customer-api";
import { mapCustomerUser, type AnyRecord } from "@/lib/customer-mappers";
import type { AuthResponse, AuthUser } from "@/types/auth";

export async function loginCustomer(email: string, password: string): Promise<AuthUser> {
  const data = await customerPost<AuthResponse>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  const user = mapCustomerUser(data.user as unknown as AnyRecord);
  persistCustomerSession(data.tokens);
  if (user.role === "admin") {
    // The API already set the site cookie; revoke it before refusing.
    await logoutCustomer();
    throw new Error("Please use the admin portal to sign in as an administrator.");
  }
  return user;
}

export type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  /** Travellers by default; "provider" starts a service-provider account. */
  role?: "customer" | "provider";
};

export async function registerCustomer(payload: RegisterPayload): Promise<AuthUser> {
  const data = await customerPost<AuthResponse>("/auth/register", {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    password: payload.password,
    role: payload.role ?? "customer",
  });
  const user = mapCustomerUser(data.user as unknown as AnyRecord);
  persistCustomerSession(data.tokens);
  return user;
}

export async function logoutCustomer() {
  try {
    await customerPost("/auth/logout");
  } catch {
    // local logout still proceeds
  } finally {
    clearCustomerSession();
  }
}

export async function fetchCustomerMe(): Promise<AuthUser> {
  const data = await customerGet<AnyRecord>("/auth/me");
  const user = mapCustomerUser(data);
  if (user.role === "admin") {
    clearCustomerSession();
    throw new Error("Admin accounts cannot use the traveller site.");
  }
  return user;
}

export async function forgotCustomerPassword(email: string) {
  return customerPost<{ message: string; demoCode?: string }>("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
}

export async function resetCustomerPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return customerPost<{ message: string }>("/auth/reset-password", {
    email: payload.email.trim().toLowerCase(),
    code: payload.code.trim(),
    newPassword: payload.newPassword,
  });
}

/** Steps of the local-driver application, as the backend tracks them. */
export type DriverStep =
  | "business"
  | "location"
  | "transport"
  | "vehicle"
  | "verification"
  | "review"
  | "submitted";

/** A provider's application, or null when they have not started one yet. */
export type ProviderApplication = {
  id: string;
  verificationStatus: "pending" | "approved" | "rejected" | "suspended";
  businessName?: string;
  services: string[];
  city?: string;
  address?: string;
  /** Saved pin, when it is a real location (not the 0,0 placeholder). */
  location?: { latitude: number; longitude: number };
  /** Local drivers only: the next step and the ones already done. */
  progress?: { nextStep: DriverStep; completedSteps: DriverStep[]; cnicVerified?: boolean };
};

export async function getProviderApplication(): Promise<ProviderApplication | null> {
  try {
    const data = await customerGet<AnyRecord>("/providers/me");
    const coords = (data.location as { coordinates?: unknown } | undefined)?.coordinates;
    const [lng, lat] = Array.isArray(coords) ? coords.map(Number) : [];
    const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    const progress = data.onboardingProgress as AnyRecord | undefined;
    const structured = data.structuredAddress as AnyRecord | undefined;
    return {
      id: String(data._id ?? data.id ?? ""),
      verificationStatus: (String(data.verificationStatus ?? "pending") as ProviderApplication["verificationStatus"]),
      businessName: data.businessName ? String(data.businessName) : undefined,
      services: Array.isArray(data.services) ? data.services.map(String) : [],
      city: data.city ? String(data.city) : undefined,
      address: String(structured?.formattedAddress ?? data.address ?? "") || undefined,
      location: hasPin ? { latitude: lat, longitude: lng } : undefined,
      progress: progress?.nextStep
        ? {
            nextStep: String(progress.nextStep) as DriverStep,
            completedSteps: Array.isArray(progress.completedSteps)
              ? (progress.completedSteps as unknown[]).map(String) as DriverStep[]
              : [],
            cnicVerified: progress.cnicVerified === undefined ? undefined : Boolean(progress.cnicVerified),
          }
        : undefined,
    };
  } catch (error) {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  }
}

