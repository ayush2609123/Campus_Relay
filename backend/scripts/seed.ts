// scripts/seed.ts
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/models/User.model";
import Vehicle from "../src/models/Vehicle.model";
import Trip from "../src/models/Trip.model";
import Hub from "../src/models/Hub.model";
import { hubs } from "./seed-hubs";
const MONGO = process.env.MONGO_URL!;

function at(dayOffset: number, hh: number, mm=0) {
  const d = new Date(); d.setDate(d.getDate()+dayOffset); d.setHours(hh, mm, 0, 0); return d;
}

async function main() {
  await mongoose.connect(MONGO);

  // Hubs (upsert)
  for (const h of hubs) await Hub.updateOne({ name: h.name }, { $set: h }, { upsert: true });

  // Demo users
  const [driver] = await Promise.all([
    upsertUser("driver@demo.app", "Driver Demo", "driver"),
    upsertUser("rider@demo.app", "Rider Demo", "rider"),
  ]);

  // Vehicle
  const veh = await Vehicle.findOneAndUpdate(
    { userId: driver._id, plateNumber: "MH12-AB-1234" },
    { userId: driver._id, make: "Maruti", model: "Ertiga", seats: 6 },
    { upsert: true, new: true }
  );

  // Trips (next 3 days, morning/evening)
  const get = async (n: string) => Hub.findOne({ name: n }).lean();
  const iiit = await get("IIIT Pune (Talegaon)");
  const pnq  = await get("PNQ Airport (Lohegaon)");
  const hj1  = await get("Hinjawadi Phase 1");
  const puneJ = await get("Pune Junction (Railway Station)");

  const templates = [
    { o: hj1,  d: iiit,     t: at(0, 18), price: 110, seats: 5 },
    { o: iiit, d: pnq,      t: at(1, 7,30), price: 150, seats: 4 },
    { o: pnq,  d: iiit,     t: at(1, 21), price: 150, seats: 4 },
    { o: iiit, d: puneJ,    t: at(2, 9), price: 99, seats: 6 },
    { o: puneJ,d: iiit,     t: at(2, 19), price: 99, seats: 6 },
  ].filter(x => x.o && x.d) as any[];

  for (const x of templates) {
    await Trip.create({
      driverId: driver._id,
      vehicleId: veh._id,
      origin: x.o, destination: x.d,
      startTime: x.t,
      pricePerSeat: x.price,
      totalSeats: x.seats,
      seatsLeft: x.seats,
      status: "published"
    });
  }

  console.log("Seed OK.");
  process.exit(0);
}

async function upsertUser(email: string, name: string, role: "rider" | "driver") {
  const pwd = await bcrypt.hash("demo1234", 10);
  return User.findOneAndUpdate(
    { email },
    { email, name, role, passwordHash: pwd },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function hin(x:any){ return x; } // tiny ts helper
main().catch(e => (console.error(e), process.exit(1)));
