import { get, put } from "@/lib/api";
import { asArray } from "@/lib/utils";
import type {
  AdminDashboard,
  BookingRecord,
  Customer,
  PaymentRecord,
  ProviderProfile,
  ReviewRecord,
  SupportTicket,
} from "@/types/admin";
import type { Paginated } from "@/types/auth";

export async function getDashboard() {
  return get<AdminDashboard>("/admin/dashboard");
}

export async function getReports(range = "30d") {
  return get<Record<string, unknown>>("/admin/reports", { params: { range } });
}

export async function listProviders(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const data = await get<Paginated<ProviderProfile> | ProviderProfile[]>("/admin/providers", {
    params,
  });
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
    };
  }
  return data;
}

export async function getProvider(id: string) {
  return get<ProviderProfile>(`/admin/providers/${id}`);
}

export async function approveProvider(id: string) {
  return put<ProviderProfile>(`/admin/providers/${id}/approve`);
}

export async function rejectProvider(id: string, reason?: string) {
  return put<ProviderProfile>(`/admin/providers/${id}/reject`, { reason });
}

export async function suspendProvider(id: string, reason?: string) {
  return put<ProviderProfile>(`/admin/providers/${id}/suspend`, { reason });
}

export async function listCustomers() {
  return get<Customer[]>("/admin/customers");
}

export async function getCustomer(id: string) {
  return get<{ customer: Customer; bookings: BookingRecord[] }>(`/admin/customers/${id}`);
}

export async function listVehicles(params?: {
  status?: string;
  type?: string;
  providerId?: string;
}) {
  const data = await get<{
    items: unknown[];
    stats: {
      total: number;
      pending: number;
      active: number;
      rejected: number;
      suspended: number;
    };
  }>("/admin/vehicles", { params });
  return {
    items: asArray(data?.items ?? data),
    stats: data?.stats ?? {
      total: 0,
      pending: 0,
      active: 0,
      rejected: 0,
      suspended: 0,
    },
  };
}

export async function getVehicle(id: string) {
  return get<{
    vehicle: Record<string, unknown>;
    seatSummary: {
      totalSeats: number;
      activeTrips: number;
      bookedSeats: number;
      availableSeats: number;
      trips: unknown[];
    };
  }>(`/admin/vehicles/${id}`);
}

export async function approveVehicle(id: string) {
  return put(`/admin/vehicles/${id}/approve`);
}

export async function rejectVehicle(id: string, reason: string) {
  return put(`/admin/vehicles/${id}/reject`, { reason });
}

export async function suspendVehicle(id: string, reason?: string) {
  return put(`/admin/vehicles/${id}/suspend`, { reason });
}

export async function getVehicleTrips(id: string) {
  return get(`/admin/vehicles/${id}/trips`);
}

export async function listRoutes() {
  return asArray(await get("/admin/routes"));
}

export async function getRoute(id: string) {
  return get(`/admin/routes/${id}`);
}

export async function listPickupPoints() {
  return asArray(await get("/admin/pickup-points"));
}

export async function getPickupPoint(id: string) {
  return get(`/admin/pickup-points/${id}`);
}

export async function listTrips() {
  return asArray(await get("/admin/trips"));
}

export async function getTrip(id: string) {
  return get(`/admin/trips/${id}`);
}

export async function listHotels() {
  return asArray(await get("/admin/hotels"));
}

export async function getHotel(id: string) {
  return get<unknown>(`/admin/hotels/${id}`);
}

export async function approveHotel(id: string) {
  return put<unknown>(`/admin/hotels/${id}/approve`);
}

export async function rejectHotel(id: string, reason?: string) {
  return put<unknown>(`/admin/hotels/${id}/reject`, { reason });
}

export async function suspendHotel(id: string, reason?: string) {
  return put<unknown>(`/admin/hotels/${id}/suspend`, { reason });
}

export async function requestHotelChanges(id: string, reason?: string) {
  return put<unknown>(`/admin/hotels/${id}/request-changes`, { reason });
}

export async function listRooms() {
  return asArray(await get("/admin/rooms"));
}

export async function getRoom(id: string) {
  return get(`/admin/rooms/${id}`);
}

export async function listAvailability(params?: { roomId?: string; from?: string; to?: string }) {
  return asArray(await get("/admin/availability", { params }));
}

export async function listBookings() {
  return asArray<BookingRecord>(await get("/admin/bookings"));
}

export async function getBooking(id: string) {
  return get<BookingRecord>(`/admin/bookings/${id}`);
}

export async function listPayments() {
  return asArray<PaymentRecord>(await get("/admin/payments"));
}

export async function getPayment(id: string) {
  return get<PaymentRecord>(`/admin/payments/${id}`);
}

export async function listReviews() {
  return asArray<ReviewRecord>(await get("/admin/reviews"));
}

export async function listNotifications() {
  return asArray(await get("/admin/notifications"));
}

export async function listMessages() {
  return asArray(await get("/admin/messages"));
}

export async function listSupport() {
  return asArray<SupportTicket>(await get("/admin/support"));
}

export async function getSupport(id: string) {
  return get<SupportTicket>(`/admin/support/${id}`);
}

export async function updateSupport(id: string, body: { status?: string; priority?: string }) {
  return put<SupportTicket>(`/admin/support/${id}`, body);
}
