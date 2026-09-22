export type ProviderListParams = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  reports: (range: string) => ["admin", "reports", range] as const,

  providers: (params?: ProviderListParams) =>
    ["admin", "providers", "list", params ?? {}] as const,
  provider: (id: string) => ["admin", "providers", "detail", id] as const,

  customers: () => ["admin", "customers", "list"] as const,
  customer: (id: string) => ["admin", "customers", "detail", id] as const,

  vehicles: () => ["admin", "vehicles", "list"] as const,
  vehicle: (id: string) => ["admin", "vehicles", "detail", id] as const,

  routes: () => ["admin", "routes", "list"] as const,
  route: (id: string) => ["admin", "routes", "detail", id] as const,

  pickupPoints: () => ["admin", "pickup-points", "list"] as const,
  pickupPoint: (id: string) => ["admin", "pickup-points", "detail", id] as const,

  trips: () => ["admin", "trips", "list"] as const,
  trip: (id: string) => ["admin", "trips", "detail", id] as const,

  hotels: () => ["admin", "hotels", "list"] as const,
  hotel: (id: string) => ["admin", "hotels", "detail", id] as const,

  rooms: () => ["admin", "rooms", "list"] as const,
  room: (id: string) => ["admin", "rooms", "detail", id] as const,

  availability: (params?: Record<string, string | undefined>) =>
    ["admin", "availability", params ?? {}] as const,

  bookings: () => ["admin", "bookings", "list"] as const,
  booking: (id: string) => ["admin", "bookings", "detail", id] as const,

  payments: () => ["admin", "payments", "list"] as const,
  payment: (id: string) => ["admin", "payments", "detail", id] as const,

  reviews: () => ["admin", "reviews", "list"] as const,
  messages: () => ["admin", "messages", "list"] as const,
  notifications: () => ["admin", "notifications", "list"] as const,

  supportTickets: () => ["admin", "support", "list"] as const,
  supportTicket: (id: string) => ["admin", "support", "detail", id] as const,
};
