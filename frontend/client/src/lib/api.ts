// src/lib/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// --- 401 -> refresh -> retry interceptor ---
let refreshing = false;
let pending: Array<() => void> = [];

api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (!error.response) throw error;

    // avoid infinite loop
    const status = error.response.status;
    if (status === 401 && !original?._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = true;
        try {
          await api.post("/auth/refresh");
          pending.forEach(fn => fn());
          pending = [];
        } catch (e) {
          pending = [];
          refreshing = false;
          // ensure app goes to login
          throw error;
        }
        refreshing = false;
      } else {
        await new Promise<void>(res => pending.push(res));
      }
      return api(original);
    }

    throw error;
  }
);

// helpers
export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    location.href = "/login";
  }
}

export { api };
export default api;
