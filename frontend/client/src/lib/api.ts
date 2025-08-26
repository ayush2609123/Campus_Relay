// src/lib/api.ts
import axios, { AxiosError } from "axios";

const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export const api = axios.create({
  baseURL: BASE,           // e.g. https://campus-relay.onrender.com/api
  withCredentials: true,   // send cookies for auth
});

// ---- simple refresh-once interceptor ----
let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const cfg: any = err.config ?? {};
    const status = err.response?.status;

    if (status === 401 && !cfg.__isRetry) {
      try {
        if (!refreshing) {
          refreshing = fetch(`${BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          }).then(res => {
            refreshing = null;
            if (!res.ok) throw new Error("refresh failed");
          }).catch(e => { refreshing = null; throw e; });
        }
        await refreshing;
        cfg.__isRetry = true;
        return api(cfg);
      } catch {
        // let the app handle logout / redirect
      }
    }
    throw err;
  }
);

// optional helpers
export async function logout() {
  try { await api.post("/auth/logout"); } finally { location.href = "/login"; }
}

// also export default for places importing `import api from "@/lib/api"`
export default api;
