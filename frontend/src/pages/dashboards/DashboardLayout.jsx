import { useNavigate } from 'react-router-dom'

export default function DashboardLayout({ title, subtitle, role, children }) {
  const navigate = useNavigate()
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}')
  function signOut() {
    localStorage.removeItem('supabase_session')
    localStorage.removeItem('user_profile')
    navigate('/signin', { replace: true })
  }
  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand"><span>+</span><div><strong>PhysioCare</strong><small>{role}</small></div></div>
        <div className="dashboard-user"><div className="avatar">{profile.first_name?.[0]}{profile.last_name?.[0]}</div><div><strong>{profile.first_name} {profile.last_name}</strong><small>{profile.email}</small></div><button className="button button--quiet" onClick={signOut}>Sign out</button></div>
      </header>
      <main className="dashboard-main">
        <section className="dashboard-title"><div><p className="eyebrow">{role} portal</p><h1>{title}</h1><p>{subtitle}</p></div></section>
        {children}
      </main>
    </div>
  )
}

export function Notice({ value, error }) {
  if (!value) return null
  return <div className={`notice ${error ? 'notice--error' : ''}`} role="status">{value}</div>
}
