import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { postLiveLocation, getTrail } from "../controllers/location.controller";

const r = Router();
r.get("/:tripId", verifyJWT, getTrail);
r.post("/:tripId", verifyJWT, postLiveLocation);

export default r;
