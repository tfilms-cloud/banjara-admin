export type UserRole = "customer" | "provider" | "admin";

/** Review state of a service provider's application. */
export type ProviderAccountStatus = "pending" | "approved" | "rejected" | "suspended";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status?: string;
  avatar?: string;
  createdAt?: string;
  /** Present for providers once their application has started. */
  providerId?: string;
  providerStatus?: ProviderAccountStatus;
  /** Admins only. */
  twoFactorEnabled?: boolean;
  /** Admins only: the API will refuse admin requests until 2-step verification is on. */
  twoFactorSetupRequired?: boolean;
};

export type AuthTokens = {
  accessToken: string;
  /** Absent for the website: the API keeps it in an httpOnly cookie. */
  refreshToken?: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type ApiSuccess<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};
