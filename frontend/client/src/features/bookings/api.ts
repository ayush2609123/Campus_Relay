import api from "@/lib/api";
import { Booking } from "./types";
import { Trip } from "@/features/trips/types";

export type BookingWithTrip = Booking & { trip?: Trip };
export async function createBooking(params: { tripId: string; seats?: number }) {
  const r = await api.post("/bookings", params);
  return (r.data?.data || r.data) as { booking: Booking; otp?: string } | Booking;
}

export async function getBooking(id: string) {
  const r = await api.get(`/bookings/${id}`);
  return (r.data?.data || r.data) as Booking;
}

export async function createPaymentIntent(bookingId: string, amount?: number, idemKey?: string) {
  const r = await api.post(
    "/payments/intent",
    { bookingId, amount },
    { headers: idemKey ? { "Idempotency-Key": idemKey } : undefined }
  );
  // backend returns { upiUri, paymentId? }
  return (r.data?.data || r.data) as { upiUri: string; paymentId?: string };
}

export async function listMyBookings(): Promise<BookingWithTrip[]> {
    const r = await api.get("/bookings/my", { params: { limit: 50 } });
    return (r.data?.data || r.data) as BookingWithTrip[];
  }
  
  export async function cancelBooking(id: string) {
    const r = await api.post(`/bookings/${id}/cancel`);
    return r.data?.data || r.data;
  }



export async function regenerateOtp(bookingId: string): Promise<{ id: string; otp: string; otpExpiresAt: string }> {
  const { data } = await api.post(`/bookings/${bookingId}/otp`);
  return data.data; // { id, otp, otpExpiresAt }
}


export async function verifyOtp(bookingId: string, code: string): Promise<{ id: string; verifiedAt: string }> {
  const { data } = await api.post(`/bookings/${bookingId}/verify-otp`, { code });
  return data.data; // { id, verifiedAt }
}
