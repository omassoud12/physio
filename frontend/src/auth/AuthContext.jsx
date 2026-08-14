import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AuthContext from './context.js'
import api from '../services/api.js'
import {
  getSupabaseClient,
  migrateLegacySession,
  setAuthSessionSnapshot,
} from '../services/supabase.js'

function readCachedProfile(userId) {
  try {
    const cached = JSON.parse(localStorage.getItem('user_profile') || 'null')
    return cached?.id === userId && cached?.role ? cached : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileRef = useRef(null)
  const syncVersionRef = useRef(0)

  const storeProfile = useCallback((nextProfile) => {
    profileRef.current = nextProfile || null
    setProfile(nextProfile || null)
    if (nextProfile) localStorage.setItem('user_profile', JSON.stringify(nextProfile))
    else localStorage.removeItem('user_profile')
  }, [])

  const syncSession = useCallback(async (nextSession, suppliedProfile = null) => {
    const syncVersion = ++syncVersionRef.current
    setAuthSessionSnapshot(nextSession)
    setSession(nextSession || null)
    setUser(nextSession?.user || null)

    if (!nextSession?.user) {
      storeProfile(null)
      setLoading(false)
      return
    }

    let nextProfile = suppliedProfile
    if (!nextProfile && profileRef.current?.id === nextSession.user.id) {
      nextProfile = profileRef.current
    }

    if (!nextProfile) {
      try {
        const response = await api.get('/profile/me')
        nextProfile = response.data.data
      } catch {
        nextProfile = readCachedProfile(nextSession.user.id)
      }
    }

    if (syncVersion !== syncVersionRef.current) return
    storeProfile(nextProfile)
    setLoading(false)
  }, [storeProfile])

  useEffect(() => {
    let active = true
    let subscription

    async function initializeAuth() {
      try {
        const client = await getSupabaseClient()
        const { data } = await client.auth.getSession()
        const restoredSession = await migrateLegacySession(client, data.session)
        if (!active) return
        await syncSession(restoredSession)

        const listener = client.auth.onAuthStateChange((_event, nextSession) => {
          window.setTimeout(() => {
            if (active) void syncSession(nextSession)
          }, 0)
        })
        subscription = listener.data.subscription
      } catch {
        if (active) {
          setAuthSessionSnapshot(null)
          setLoading(false)
        }
      }
    }

    void initializeAuth()
    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [syncSession])

  const establishSession = useCallback(async (nextSession, nextProfile) => {
    const client = await getSupabaseClient()
    const { data, error } = await client.auth.setSession({
      access_token: nextSession.access_token,
      refresh_token: nextSession.refresh_token,
    })
    if (error || !data.session) throw error || new Error('Unable to persist session')
    await syncSession(data.session, nextProfile)
    return data.session
  }, [syncSession])

  const signOut = useCallback(async () => {
    try {
      const client = await getSupabaseClient()
      await client.auth.signOut()
    } finally {
      await syncSession(null)
    }
  }, [syncSession])

  const refreshProfile = useCallback(async () => {
    if (!session) return null
    const response = await api.get('/profile/me')
    storeProfile(response.data.data)
    return response.data.data
  }, [session, storeProfile])

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    isAuthenticated: Boolean(session?.user),
    establishSession,
    refreshProfile,
    signOut,
  }), [establishSession, loading, profile, refreshProfile, session, signOut, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
