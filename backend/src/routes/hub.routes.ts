import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { listHubs, getHub, createHub, updateHub, deleteHub } from "../controllers/hub.controller";

const r = Router();

r.get("/", listHubs);
r.get("/:id", getHub);

// Admin-only ops
r.post("/", verifyJWT, createHub);
r.patch("/:id", verifyJWT, updateHub);
r.delete("/:id", verifyJWT, deleteHub);

export default r;
