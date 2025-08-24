import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { postLiveLocation, getLiveTrail } from "../controllers/location.controller";

const r = Router();

r.post("/:tripId", verifyJWT, postLiveLocation);
r.get("/:tripId", verifyJWT, getLiveTrail);

export default r;
