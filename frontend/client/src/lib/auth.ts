import { api } from "./api";

export type CurrentUser = { _id: string; name?: string; email: string; role: "rider"|"driver"|"admin" };

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const r = await api.get("/auth/me");
    return r.data?.data ?? null;
  } catch {
    // Do NOT call /auth/refresh here. The interceptor will do it for real requests.
    return null;
  }
}

export async function login(email: string, password: string) {
  const r = await api.post("/auth/login", { email, password });
  return r.data?.data as { user: CurrentUser };
}

export async function register(payload: { name: string; email: string; password: string; phone?: string }) {
  const r = await api.post("/auth/register", payload);
  return r.data?.data as { user: CurrentUser };
}

export async function logout() {
  await api.post("/auth/logout");
}
