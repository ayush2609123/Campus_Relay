import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true,
})

api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    if (error?.response?.status === 401 && !original.__isRetryRequest) {
      original.__isRetryRequest = true
      try {
        await api.post('/auth/refresh')
        return api.request(original)
      } catch (e) {
        // fallthrough to caller — UI can redirect to /login
      }
    }
    return Promise.reject(error)
  }
)

export default api
