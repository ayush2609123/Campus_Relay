import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { getMe, updateMe, listSessions, revokeSession } from "../controllers/user.controller";

const r = Router();

r.get("/me", verifyJWT, getMe);
r.patch("/me", verifyJWT, updateMe);

r.get("/sessions", verifyJWT, listSessions);
r.delete("/sessions/:sessionId", verifyJWT, revokeSession);

export default r;
