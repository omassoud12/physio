import axios from 'axios'
import { getAuthAccessToken, getSupabaseClient } from './supabase.js'

const configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const normalizedUrl = configuredUrl.replace(/\/$/, '')
const API_URL = normalizedUrl.endsWith('/api')
  ? normalizedUrl
  : `${normalizedUrl}/api`

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const accessToken = getAuthAccessToken()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('user_profile')
      void getSupabaseClient().then((client) => client.auth.signOut())
    }
    return Promise.reject(error)
  },
)

export async function testBackendConnection() {
  const response = await api.get('/test')
  return response.data
}

export default api
