import "dotenv/config";
import mongoose from "mongoose";

// Use Node 18+ (global fetch). If you’re on older Node, install undici:
// import 'undici/polyfill';

import User from "../src/models/User.model";

const BASE = process.env.BASE_URL || "http://localhost:8000";

type J = any;
async function req(method: string, path: string, body?: any, token?: string): Promise<J> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json: any;
  try { json = txt ? JSON.parse(txt) : {}; } catch { json = { raw: txt }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} :: ${JSON.stringify(json)}`);
  }
  return json.data ?? json; // your ApiResponse wraps data in .data
}

function isoPlus(hours: number) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

async function main() {
  const stamp = Date.now();
  const RIDER_EMAIL = `rider+${stamp}@example.com`;
  const DRIVER_EMAIL = `driver+${stamp}@example.com`;
  const PASSWORD = "secret123";

  console.log("== Auth: register rider ==");
  await req("POST", "/api/auth/register", { name: "Riya Rider", email: RIDER_EMAIL, password: PASSWORD });

  console.log("== Auth: register driver (starts as rider) ==");
  await req("POST", "/api/auth/register", { name: "Dev Driver", email: DRIVER_EMAIL, password: PASSWORD });

  console.log("== Promote driver via DB ==");
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.DB_NAME });
  await User.updateOne({ email: DRIVER_EMAIL.toLowerCase() }, { $set: { role: "driver" } });
  await mongoose.disconnect();

  console.log("== Login driver ==");
  const dLogin = await req("POST", "/api/auth/login", { email: DRIVER_EMAIL, password: PASSWORD });
  const DRIVER_ACCESS = dLogin.tokens?.accessToken || dLogin.accessToken;

  console.log("== Login rider ==");
  const rLogin = await req("POST", "/api/auth/login", { email: RIDER_EMAIL, password: PASSWORD });
  const RIDER_ACCESS = rLogin.tokens?.accessToken || rLogin.accessToken;

  console.log("== Create trip (driver) ==");
  const trip = await req("POST", "/api/trips", {
    kind: "shuttle",
    routeName: "IIIT Pune \u2192 Pimpri C(Shuttle)",
    origin: { name: "IIIT Pune (Talegaon)", lat: 18.7407, lng: 73.6813 },
    destination: { name: "pimpri", lat: 18.5286, lng: 73.8740 },
    startTime: isoPlus(6),
    pricePerSeat: 29,
    totalSeats: 40
  }, DRIVER_ACCESS);
  const TRIP_ID = trip._id;
  console.log("== Book seat (rider) ==");
  const bookingRes = await req("POST", "/api/bookings", { tripId: TRIP_ID, seats: 1 }, RIDER_ACCESS);
  const BOOKING_ID = bookingRes.booking?._id || bookingRes._id;
  const OTP = bookingRes.otp;
  console.log("Booking:", BOOKING_ID, "OTP:", OTP);

  console.log("== Payment intent (rider) ==");
  const intent = await fetch(`${BASE}/api/payments/intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RIDER_ACCESS}`,
      "Idempotency-Key": "smoke-1"
    },
    body: JSON.stringify({ bookingId: BOOKING_ID, amount: 49 })
  }).then(r => r.json());
  console.log("UPI URI:", intent.data?.upiUri || intent.upiUri);

  console.log("== Verify OTP (driver) ==");
  const verify = await req("POST", `/api/bookings/${BOOKING_ID}/verify-otp`, { code: OTP }, DRIVER_ACCESS);
  console.log("Verified at:", verify.verifiedAt || verify.data?.verifiedAt);

  console.log("✅ Smoke test passed. Ready for frontend.");
}

main().catch((e) => {
  console.error("❌ Smoke test failed:", e);
  process.exit(1);
});
