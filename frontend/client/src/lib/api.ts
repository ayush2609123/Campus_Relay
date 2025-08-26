import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,       // https://campus-relay.onrender.com/api
  withCredentials: true,
});

// interceptor: only try refresh once; if it fails, stop looping
let triedRefresh = false;

api.interceptors.response.use(
  r => r,
  async (err) => {
    const { config, response } = err || {};
    if (response?.status === 401 && !triedRefresh && !config?.url?.includes("/auth/refresh")) {
      triedRefresh = true;
      try {
        await api.post("/auth/refresh");
        return api(config);                      // retry original once
      } catch {
        // not logged in; fall through
      }
    }
    return Promise.reject(err);
  }
);

export default api;
