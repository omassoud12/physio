import axios from 'axios'

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
  try {
    const session = JSON.parse(localStorage.getItem('supabase_session'))
    if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`
  } catch {
    localStorage.removeItem('supabase_session')
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('supabase_session')
      localStorage.removeItem('user_profile')
      window.location.assign('/signin')
    }
    return Promise.reject(error)
  },
)

export async function testBackendConnection() {
  const response = await api.get('/test')
  return response.data
}

export default api
