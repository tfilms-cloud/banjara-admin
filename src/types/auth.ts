export type UserRole = "customer" | "provider" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status?: string;
  avatar?: string;
  createdAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
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
