// client/src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8080/api",
  withCredentials: true, // keep cookies
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const at = localStorage.getItem("accessToken");
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

// Auto-refresh on 401, then retry once
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err?.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const rt = localStorage.getItem("refreshToken");
        const headers = rt ? { Authorization: `Bearer ${rt}` } : undefined;
        const { data } = await api.post("/auth/refresh", {}, { headers });

        const accessToken = data?.data?.accessToken ?? data?.accessToken;
        const refreshToken = data?.data?.refreshToken ?? data?.refreshToken;

        if (accessToken) localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
    throw err;
  }
);

export default api;
