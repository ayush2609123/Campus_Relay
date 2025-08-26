// client/src/lib/auth.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true,
});

export type CurrentUser = { _id: string; name?: string; email: string; role: "rider"|"driver"|"admin" };

// --- existing helpers ---
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await api.get("/auth/me");
    return data?.data ?? null;
  } catch {
    return null;
  }
}

export async function login(payload: { email: string; password: string }) {
  await api.post("/auth/login", payload);
}
export async function register(payload: { name: string; email: string; password: string }) {
  await api.post("/auth/register", payload);
}
export async function logout() {
  try { await api.post("/auth/logout"); } finally { location.href = "/login"; }
}

// ✅ add this alias so files importing { fetchMe } keep working
export async function fetchMe() { 
  return getCurrentUser();
}

// keep default for `import api from "@/lib/api"`
export { api };
export default api;
