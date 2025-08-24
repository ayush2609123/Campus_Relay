import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createTrip,
  getTrip,
  searchTrips,
  myTrips,
  updateTrip,
  publishTrip,
  cancelTrip,
  startTrip,
  completeTrip
} from "../controllers/trip.controller";

const r = Router();

// public
r.get("/search", searchTrips);
r.get("/:id", getTrip);

// authed driver/admin
r.post("/", verifyJWT, createTrip);
r.get("/me/mine", verifyJWT, myTrips); // list my trips
r.patch("/:id", verifyJWT, updateTrip);
r.post("/:id/publish", verifyJWT, publishTrip);
r.post("/:id/cancel", verifyJWT, cancelTrip);
r.post("/:id/start", verifyJWT, startTrip);
r.post("/:id/complete", verifyJWT, completeTrip);

export default r;
