import { clearSession, get, persistSession, post } from "@/lib/api";
import { idOf } from "@/lib/utils";
import type { AuthResponse, AuthUser } from "@/types/auth";

export function mapUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: idOf(raw),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    role: (raw.role as AuthUser["role"]) ?? "customer",
    status: raw.status ? String(raw.status) : undefined,
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    twoFactorEnabled: raw.twoFactorEnabled === undefined ? undefined : Boolean(raw.twoFactorEnabled),
    twoFactorSetupRequired: Boolean(raw.twoFactorSetupRequired),
  };
}

/** Sign-in either finishes, or (2-step verification on) asks for a code. */
export type AdminLoginResult =
  | { kind: "signed-in"; user: AuthUser }
  | { kind: "code-required"; mfaToken: string };

type LoginPayload = AuthResponse | { mfaRequired: true; mfaToken: string };

async function acceptSession(data: AuthResponse): Promise<AuthUser> {
  const user = mapUser(data.user as unknown as Record<string, unknown>);
  persistSession(data.tokens);
  if (user.role !== "admin") {
    // The API already set this portal's cookie; revoke it before refusing.
    await logoutAdmin();
    throw new Error("Access denied. This portal is for BANJARA administrators only.");
  }
  return user;
}

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResult> {
  const data = await post<LoginPayload>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  if ("mfaRequired" in data && data.mfaRequired) {
    return { kind: "code-required", mfaToken: data.mfaToken };
  }
  return { kind: "signed-in", user: await acceptSession(data as AuthResponse) };
}

/** Second sign-in step: a code from the authenticator app, or a recovery code. */
export async function completeAdminLogin(mfaToken: string, code: string): Promise<AuthUser> {
  const data = await post<AuthResponse>("/auth/login/2fa", { mfaToken, code: code.trim() });
  return acceptSession(data);
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

export async function logoutAdminEverywhere() {
  try {
    await post("/auth/logout-all");
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

/* 2-step verification */

export type TwoFactorStatus = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
};

export const getTwoFactorStatus = () => get<TwoFactorStatus>("/auth/2fa");

export const startTwoFactorSetup = () =>
  post<{ secret: string; otpauthUrl: string }>("/auth/2fa/setup");

export const confirmTwoFactor = (code: string) =>
  post<{ recoveryCodes: string[] }>("/auth/2fa/enable", { code: code.trim() });

export const turnOffTwoFactor = (password: string, code: string) =>
  post<{ enabled: false }>("/auth/2fa/disable", { password, code: code.trim() });

/* Audit log */

export type AuditEntry = {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  adminId?: { _id: string; name?: string; email?: string } | string | null;
  meta?: { ip?: string; userAgent?: string; reason?: string; client?: string; body?: Record<string, unknown> } & Record<
    string,
    unknown
  >;
  createdAt: string;
};

export const getAuditLog = (limit = 200) => get<AuditEntry[]>("/admin/audit-logs", { params: { limit } });
