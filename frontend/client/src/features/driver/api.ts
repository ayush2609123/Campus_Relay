import api from "@/lib/api";

export async function becomeDriver(code: string) {
  const { data } = await api.post("/users/driver/enroll", { code });
  return data?.data ?? data;
}
