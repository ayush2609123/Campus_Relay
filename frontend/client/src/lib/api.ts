import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
  withCredentials: true, // send/receive cookies
});

let isRefreshing = false;
let waiters: Array<(ok: boolean) => void> = [];
const subscribe = (cb: (ok: boolean) => void) => waiters.push(cb);
const flush = (ok: boolean) => { waiters.forEach(cb => cb(ok)); waiters = []; };

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const res = err.response;
    const cfg = err.config as InternalAxiosRequestConfig | undefined;
    if (!res || !cfg) throw err;

    const path = new URL(cfg.url ?? "", api.defaults.baseURL as string).pathname;

    // Only try refresh once, and never for auth endpoints themselves.
    if (res.status === 401 && !cfg._retry && !path.startsWith("/auth/")) {
      cfg._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await api.post("/auth/refresh", null, { withCredentials: true });
          flush(true);
        } catch {
          flush(false);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        subscribe(ok => ok ? resolve(api(cfg)) : reject(err));
      });
    }

    throw err;
  }
);
