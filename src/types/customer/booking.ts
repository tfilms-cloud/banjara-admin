export type BookingStatus =
  "upcoming" | "confirmed" | "completed" | "cancelled";
export type PaymentMethod = "card" | "wallet" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type TransportBooking = {
  id: string;
  bookingCode: string;
  bookingType: "transport";
  tripId: string;
  userId: string;
  providerId: string;
  date: string;
  seats: string[];
  pickupPoint?: string;
  passengerName: string;
  passengerPhone: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  from?: string;
  to?: string;
  departureTime?: string;
  agencyName?: string;
};

export type HotelBooking = {
  id: string;
  bookingCode: string;
  bookingType: "hotel";
  hotelId: string;
  roomId: string;
  userId: string;
  providerId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  guestName: string;
  guestPhone: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  hotelName?: string;
};

export type CustomerBooking = TransportBooking | HotelBooking;

export type CreateTransportBookingPayload = {
  tripId: string;
  seats: string[];
  pickupPointId?: string;
  passengerDetails: { name: string; phone: string };
  passengers?: { name: string; phone: string }[];
  paymentMethod: PaymentMethod;
};
