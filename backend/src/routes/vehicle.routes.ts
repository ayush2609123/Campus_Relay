import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createVehicle,
  listMyVehicles,
  updateVehicle,
  deleteVehicle
} from "../controllers/vehicle.controller";

const r = Router();

r.post("/", verifyJWT, createVehicle);
r.get("/my", verifyJWT, listMyVehicles);
r.patch("/:id", verifyJWT, updateVehicle);
r.delete("/:id", verifyJWT, deleteVehicle);

export default r;
