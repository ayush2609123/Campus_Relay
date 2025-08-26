// src/lib/api.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true, // send/receive httpOnly cookies
});

// --- refresh logic (single-flight, no loops) ---
let isRefreshing = false;
let waiters: Array<() => void> = [];

function onRefreshed() {
  waiters.forEach((fn) => fn());
  waiters = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If unauthorized and we haven't tried refresh yet…
    if (
      status === 401 &&
      original &&
      !original._retry &&
      // don't try to refresh for these endpoints
      !String(original.url || "").includes("/auth/login") &&
      !String(original.url || "").includes("/auth/register") &&
      !String(original.url || "").includes("/auth/refresh")
    ) {
      original._retry = true;

      // Single-flight refresh
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await api.post("/auth/refresh");
          onRefreshed();
        } catch {
          // refresh failed — reject all and let UI route to /login
          onRefreshed();
          isRefreshing = false;
          throw error;
        }
        isRefreshing = false;
      } else {
        // wait until the in-flight refresh finishes
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
      // retry the original request once
      return api(original);
    }

    throw error;
  }
);

// Optional helper
export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    // hard nav so any stale UI/Query state resets
    location.href = "/login";
  }
}

// Export both named and default (some files import default, some `{ api }`)
export { api };
export default api;
