import api from './api'
export type CurrentUser = { _id: string; name?: string; email: string; role: 'rider'|'driver'|'admin' }
export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const r = await api.get('/auth/me')
    return r.data?.data || r.data || null
  } catch { return null }
}
