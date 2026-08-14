import { createClient } from '@supabase/supabase-js'

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const normalizedApiUrl = configuredApiUrl.replace(/\/$/, '')
const API_URL = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`

let clientPromise
let sessionSnapshot = null

async function loadPublicConfig() {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL
  const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (configuredUrl && configuredKey) {
    return { url: configuredUrl, publishableKey: configuredKey }
  }

  const response = await fetch(`${API_URL}/auth/config`)
  if (!response.ok) throw new Error('Unable to initialize authentication')
  const payload = await response.json()
  return payload.data
}

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = loadPublicConfig().then(({ url, publishableKey }) => {
      if (!url || !publishableKey) {
        throw new Error('Supabase public configuration is incomplete')
      }

      return createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    })
  }

  return clientPromise
}

export function setAuthSessionSnapshot(session) {
  sessionSnapshot = session || null
}

export function getAuthAccessToken() {
  return sessionSnapshot?.access_token || ''
}

export async function migrateLegacySession(client, currentSession) {
  if (currentSession) {
    localStorage.removeItem('supabase_session')
    return currentSession
  }

  // One-time bridge from the app's previous storage key. Supabase validates
  // these real session tokens, persists them under its managed key, and the
  // legacy key is removed immediately; it is never used as ongoing auth state.
  let legacySession
  try {
    legacySession = JSON.parse(localStorage.getItem('supabase_session') || 'null')
  } catch {
    legacySession = null
  } finally {
    localStorage.removeItem('supabase_session')
  }

  if (!legacySession?.access_token || !legacySession?.refresh_token) return null

  const { data, error } = await client.auth.setSession({
    access_token: legacySession.access_token,
    refresh_token: legacySession.refresh_token,
  })
  if (error) return null
  return data.session
}
