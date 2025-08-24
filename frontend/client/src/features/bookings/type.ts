export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  _id: string;
  userId: string;
  tripId: string;
  seats: number;
  status: BookingStatus;
  pricePerSeat?: number; // optional if your API returns it
  totalAmount?: number;  // seats * price; optional
  createdAt: string;
  verifiedAt?: string;
  otpLast4?: string; // optional if you expose masked OTP
};
