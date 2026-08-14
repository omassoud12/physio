import { Navigate } from 'react-router-dom'
import { dashboardForRole } from '../auth/routes.js'
import useAuth from '../auth/useAuth.js'

export default function RoleRoute({ allowedRoles, children }) {
  const { isAuthenticated, loading, profile } = useAuth()

  if (loading) {
    return <div className="auth-route-loading" role="status" aria-live="polite">Loading… / جارٍ التحميل…</div>
  }
  if (!isAuthenticated || !profile?.role) return <Navigate to="/signin" replace />
  if (!allowedRoles.includes(profile.role)) return <Navigate to={dashboardForRole(profile.role)} replace />
  return children
}
