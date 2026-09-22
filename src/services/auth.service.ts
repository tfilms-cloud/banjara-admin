import { clearSession, get, persistSession, post } from "@/lib/api";
import { idOf } from "@/lib/utils";
import type { AuthResponse, AuthUser } from "@/types/auth";

function mapUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: idOf(raw),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    role: (raw.role as AuthUser["role"]) ?? "customer",
    status: raw.status ? String(raw.status) : undefined,
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export async function loginAdmin(email: string, password: string): Promise<AuthUser> {
  const data = await post<AuthResponse>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  const user = mapUser(data.user as unknown as Record<string, unknown>);
  if (user.role !== "admin") {
    throw new Error("Access denied. This portal is for BANJARA administrators only.");
  }
  persistSession(user, data.tokens);
  return user;
}

export async function logoutAdmin() {
  try {
    await post("/auth/logout");
  } catch {
    // local logout still proceeds
  } finally {
    clearSession();
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await get<Record<string, unknown>>("/auth/me");
  const user = mapUser(data);
  if (user.role !== "admin") {
    clearSession();
    throw new Error("Access denied.");
  }
  return user;
}

export async function forgotPassword(email: string) {
  return post<{ message: string; demoCode?: string }>("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
}
