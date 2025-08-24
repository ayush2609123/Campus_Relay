import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { getMe, updateMe, listSessions, revokeSession } from "../controllers/user.controller";
import { enrollDriver } from "../controllers/user.controller";
const r = Router();

r.get("/me", verifyJWT, getMe);
r.patch("/me", verifyJWT, updateMe);

r.get("/sessions", verifyJWT, listSessions);
r.delete("/sessions/:sessionId", verifyJWT, revokeSession);

r.post("/driver/enroll", verifyJWT, enrollDriver);
export default r;
