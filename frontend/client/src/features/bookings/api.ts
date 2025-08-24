import api from "@/lib/api";

export type BookingWithTrip = {
  _id: string;
  seats: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  verifiedAt?: string;
  trip?: {
    _id: string;
    origin: { name: string };
    destination: { name: string };
    startTime: string;
    pricePerSeat?: number;
    kind?: "carpool" | "shuttle";
    routeName?: string;
  };
};

export async function listMyBookings(): Promise<BookingWithTrip[]> {
  const { data } = await api.get("/bookings/my");
  return data.data;
}

export async function getBooking(id: string): Promise<BookingWithTrip> {
  const { data } = await api.get(`/bookings/${id}`);
  return data.data;
}

export async function createBooking(input: { tripId: string; seats: number }) {
  const { data } = await api.post("/bookings", input);
  return data.data; // { booking, otp? }
}

export async function cancelBooking(id: string) {
  const { data } = await api.post(`/bookings/${id}/cancel`);
  return data.data;
}

// --- OTP + Payment ---
export async function regenerateOtp(id: string): Promise<{ id: string; otp: string; otpExpiresAt: string }> {
  const { data } = await api.post(`/bookings/${id}/otp`);
  return data.data;
}

export async function verifyOtp(id: string, code: string) {
  const { data } = await api.post(`/bookings/${id}/verify-otp`, { code });
  return data.data; // { id, verifiedAt }
}

export async function createPaymentIntent(bookingId: string, amount?: number, idemKey?: string) {
  const { data } = await api.post(
    "/payments/intent",
    { bookingId, amount },
    { headers: idemKey ? { "Idempotency-Key": idemKey } : undefined }
  );
  return data.data; // { upiUri, paymentId? }
}
