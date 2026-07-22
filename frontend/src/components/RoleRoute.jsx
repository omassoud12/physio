import { Navigate } from 'react-router-dom'

const dashboardByRole = {
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
  physiotherapist: '/physiotherapist/dashboard',
}

export default function RoleRoute({ allowedRoles, children }) {
  let session
  let profile
  try {
    session = JSON.parse(localStorage.getItem('supabase_session'))
    profile = JSON.parse(localStorage.getItem('user_profile'))
  } catch {
    return <Navigate to="/signin" replace />
  }
  if (!session?.access_token || !profile?.role) return <Navigate to="/signin" replace />
  if (!allowedRoles.includes(profile.role)) return <Navigate to={dashboardByRole[profile.role] || '/signin'} replace />
  return children
}
