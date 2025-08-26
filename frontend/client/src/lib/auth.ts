import { api } from "./api";

export type CurrentUser = { _id: string; name?: string; email: string; role: "rider"|"driver"|"admin" };

export async function login(email: string, password: string) {
  await api.post("/auth/login", { email, password });
  // hydrate cache
  await api.get("/auth/me");
}

export async function logout() {
  try { await api.post("/auth/logout"); } finally { location.href = "/login"; }
}



export async function register(payload: { name: string; email: string; password: string; phone?: string }) {
  const r = await api.post("/auth/register", payload);
  return r.data?.data as { user: CurrentUser };
}

