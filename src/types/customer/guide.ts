export type GuidePricing = "per_person" | "per_group" | "per_hour" | "per_day" | "custom";
export type GuideService = {
  id: string; name: string; category: string; description: string; fallback?: boolean;
  durationLabel: string; durationHours?: number;
  price: number; pricingType: GuidePricing; currency: string;
  minGuests: number; maxGuests: number;
  included: string[]; excluded: string[]; meetingPoint: string;
  locations: string[]; notes: string;
};
export type GuideProfile = {
  id: string; userId: string; name: string; city: string; currentLocation: string;
  portrait: string; photos: { url: string; caption: string; category: string }[];
  bio: string; description: string; phone: string;
  verified: boolean; rating: number; reviewCount: number; yearsExperience: number;
  guideTypes: string[]; areas: string[]; skills: string[]; certifications: string[];
  training: string[]; awards: string[]; expertise: string[];
  languages: { language: string; proficiency: string }[];
  services: GuideService[];
};
export type GuideAvailability = {
  weekly: { day: string; enabled: boolean; startTime: string; endTime: string }[];
  blockedDates: string[]; availableFrom: string; availableUntil: string;
  minBookingHours?: number; maxBookingHours?: number; advanceBookingHours: number;
};
export type GuidePlan = {
  service: string; date: string; startTime: string; hours: number; guests: number;
  meetingPoint: string; location: string;
};
export type GuideGuest = { name: string; email: string; phone: string; specialRequests: string };
export type GuideReview = { id: string; rating: number; comment: string; createdAt: string; reply: string };
