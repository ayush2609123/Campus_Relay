// src/lib/api.ts
import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL || "https://campus-relay.onrender.com/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// ---- optional: de-dupe refresh to avoid many /auth/refresh calls
let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config as any;
    if (err.response?.status === 401 && !cfg?._retry) {
      cfg._retry = true;

      // run one refresh at a time
      refreshing ??= (async () => {
        try {
          await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        } catch {
          // ignore – user is simply unauthenticated
        } finally {
          refreshing = null;
        }
      })();

      await refreshing;
      return api(cfg); // retry once
    }
    return Promise.reject(err);
  }
);

// handy helpers (optional)
export const logout = () => api.post("/auth/logout");
export const me = () => api.get("/auth/me");

// 👇 this line fixes your build (TopNav imports default)
export default api;
