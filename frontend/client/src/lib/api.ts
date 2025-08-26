// src/lib/api.ts
import axios, { AxiosError } from "axios";
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "/api",
    withCredentials: true,
  });

// optional helpers
export async function logout() {
  try { await api.post("/auth/logout"); } finally { location.href = "/login"; }
}

// also export default for places importing `import api from "@/lib/api"`
export default api;
