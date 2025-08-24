import { Router } from "express";
import { register, login, refresh, logout, logoutAll, me } from "../controllers/auth.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const r = Router();

r.post("/register", register);
r.post("/login", login);
r.post("/refresh", refresh);
r.post("/logout", logout);
r.post("/logout-all", verifyJWT, logoutAll);
r.get("/me", verifyJWT, me);

export default r;
