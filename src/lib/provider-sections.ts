import {
  BedDouble,
  Bell,
  CalendarRange,
  CalendarCheck,
  CarFront,
  CreditCard,
  MessageSquare,
  Route,
  Settings,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Plain module (no "use client"): the server page reads this list to validate the URL.
/** What each section will hold — the same as the app's provider screens. */
export const PROVIDER_SECTIONS: Record<
  string,
  { title: string; icon: LucideIcon; intro: string; points: string[] }
> = {
  rooms: {
    title: "My rooms",
    icon: BedDouble,
    intro: "The room types travellers can book, with prices per night.",
    points: ["Add and edit room types", "Prices, beds and photos", "How many rooms of each type"],
  },
  availability: {
    title: "Availability",
    icon: CalendarRange,
    intro: "Open or close your rooms night by night.",
    points: ["See booked and free rooms", "Close nights for repairs or private use", "Reopen them any time"],
  },
  trips: {
    title: "My trips",
    icon: CarFront,
    intro: "Publish rides on your routes and manage seats.",
    points: ["Create a trip with date, time, fare and pickup points", "See seats booked on each trip", "Edit or cancel a trip", "Your vehicle, routes and pickup stops"],
  },
  intercity: {
    title: "City to City",
    icon: Route,
    intro: "Door-to-door ride requests between cities.",
    points: ["Accept, counter or decline requests", "Start and complete your rides", "Share your location with the traveller"],
  },
  bookings: {
    title: "Bookings",
    icon: CalendarCheck,
    intro: "Every seat or vehicle travellers book with you.",
    points: ["Approve or decline new requests", "Passenger names, seats and pickup points", "Payment status for each booking"],
  },
  earnings: {
    title: "Earnings",
    icon: Wallet,
    intro: "What you’ve earned and what’s on its way to you.",
    points: ["Today, this week and this month", "Payouts waiting and paid", "BANJARA service fee breakdown"],
  },
  messages: {
    title: "Messages",
    icon: MessageSquare,
    intro: "Chat with travellers about pickups and plans.",
    points: ["Conversations with travellers who booked", "Share pickup details", "Get notified of new messages"],
  },
  reviews: {
    title: "Reviews",
    icon: Star,
    intro: "What travellers say after riding with you.",
    points: ["Your rating and all reviews", "Reply to reviews"],
  },
  notifications: {
    title: "Notifications",
    icon: Bell,
    intro: "Updates about your application, bookings and payouts.",
    points: ["New booking requests", "Application and approval updates", "Payout updates"],
  },
  payments: {
    title: "Payments & top-up",
    icon: CreditCard,
    intro: "How you get paid and your BANJARA balance.",
    points: ["Bank or wallet accounts for payouts", "Top up your balance", "Payment history"],
  },
  profile: {
    title: "Profile",
    icon: UserRound,
    intro: "How travellers see you on BANJARA.",
    points: ["Your photo, name and about", "Your vehicle and routes", "Contact details"],
  },
  settings: {
    title: "Settings",
    icon: Settings,
    intro: "Your account, alerts, password and signed-in devices.",
    points: ["Notification preferences", "Password", "Devices you are signed in on"],
  },
};
