// backend/scripts/seed.ts
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.model";
import Vehicle from "../src/models/Vehicle.model";
import Trip from "../src/models/Trip.model";

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI!;
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || "campus_relay" });

  const riderEmail = "demo.rider@campusrelay.dev";
  const driverEmail = "demo.driver@campusrelay.dev";
  const pass = await bcrypt.hash("demo1234", 12);

  const [rider] = await User.findOrCreate?.({ email: riderEmail } as any) ??
    [await User.findOneAndUpdate({ email: riderEmail }, { email: riderEmail, passwordHash: pass, role: "rider", name: "Demo Rider" }, { upsert: true, new: true })];

  const [driver] = await User.findOrCreate?.({ email: driverEmail } as any) ??
    [await User.findOneAndUpdate({ email: driverEmail }, { email: driverEmail, passwordHash: pass, role: "driver", name: "Demo Driver" }, { upsert: true, new: true })];

  const vehicle = await Vehicle.findOneAndUpdate(
    { userId: driver._id, plateNumber: "MH12-DEMO" },
    { userId: driver._id, make: "Maruti", model: "Ertiga", plateNumber: "MH12-DEMO", seats: 6 },
    { upsert: true, new: true }
  );

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 2, 0, 0);

  await Trip.findOneAndUpdate(
    { driverId: driver._id, "origin.name": "IIIT Pune", "destination.name": "Pune Station", startTime: start },
    {
      driverId: driver._id,
      vehicleId: vehicle._id,
      origin: { name: "IIIT Pune", lat: 18.724, lng: 73.675 },
      destination: { name: "Pune Station", lat: 18.528, lng: 73.874 },
      startTime: start,
      pricePerSeat: 49,
      totalSeats: 6,
      seatsLeft: 6,
      status: "published"
    },
    { upsert: true, new: true }
  );

  console.log("Seeded demo rider, driver, vehicle, and a trip.");
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
