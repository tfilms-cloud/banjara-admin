export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export type ProviderProfile = {
  _id?: string;
  id?: string;
  userId?: string | { _id?: string; id?: string; name?: string; email?: string; phone?: string };
  businessName: string;
  ownerName: string;
  providerType?: string[];
  services?: string[];
  description?: string;
  phone: string;
  email: string;
  website?: string;
  socialMedia?: string;
  address: string;
  city: string;
  structuredAddress?: {
    street?: string;
    area?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string;
  };
  location?: { type?: string; coordinates?: [number, number] };
  verificationStatus: VerificationStatus;
  rating?: number;
  totalReviews?: number;
  yearsExperience?: number;
  logo?: string;
  rejectionReason?: string;
  transportDetails?: Record<string, unknown>;
  hotelDetails?: Record<string, unknown>;
  tourDetails?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminDashboard = {
  totalCustomers: number;
  totalProviders: number;
  pendingProviders: number;
  activeProviders?: number;
  totalTrips: number;
  totalHotels: number;
  totalBookings: number;
  todaysBookings?: number;
  revenue: number;
  platformFees: number;
  pendingPayments?: number;
  openTickets: number;
  todaysTrips?: number;
  upcomingTrips?: number;
  bookedSeats?: number;
  availableSeats?: number;
  totalRooms?: number;
  occupiedRooms?: number;
  availableRooms?: number;
  todaysCheckIns?: number;
  todaysCheckOuts?: number;
  recentBookings?: unknown[];
  recentProviders?: ProviderProfile[];
  recentPayments?: unknown[];
  recentTickets?: unknown[];
  charts?: { date: string; bookings: number; revenue: number }[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status?: string;
  avatar?: string;
  createdAt?: string;
};

export type BookingRecord = {
  _id?: string;
  id?: string;
  bookingNumber: string;
  customerId?: string | Record<string, unknown>;
  providerId?: string | Record<string, unknown>;
  bookingType: "transport" | "hotel" | "package";
  transportBooking?: Record<string, unknown>;
  hotelBooking?: Record<string, unknown>;
  subtotal?: number;
  tax?: number;
  serviceFee?: number;
  discount?: number;
  totalAmount: number;
  currency?: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentRecord = {
  _id?: string;
  id?: string;
  bookingId?: string | Record<string, unknown>;
  customerId?: string | Record<string, unknown>;
  providerId?: string | Record<string, unknown>;
  amount: number;
  currency?: string;
  method: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
  createdAt?: string;
};

export type SupportTicket = {
  _id?: string;
  id?: string;
  userId?: string | Record<string, unknown>;
  bookingId?: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "inProgress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt?: string;
  updatedAt?: string;
};

export type ReviewRecord = {
  _id?: string;
  id?: string;
  providerId?: string | Record<string, unknown>;
  customerId?: string | Record<string, unknown>;
  bookingId?: string;
  rating: number;
  comment?: string;
  reply?: string;
  createdAt?: string;
};
