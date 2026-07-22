import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'

const blankHours = { day_of_week: 'monday', start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 }

export default function PhysiotherapistDashboard() {
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [hours, setHours] = useState([])
  const [newHours, setNewHours] = useState(blankHours)
  const [tab, setTab] = useState('schedule')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [me, visits, patientList, availability] = await Promise.all([api.get('/physiotherapist/me'), api.get('/physiotherapist/appointments'), api.get('/physiotherapist/patients'), api.get('/physiotherapist/availability')])
      setProfile(me.data.data); setAppointments(visits.data.data); setPatients(patientList.data.data); setHours(availability.data.data)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load dashboard') }
  }
  useEffect(() => { load() }, [])
  async function saveProfile(event) {
    event.preventDefault()
    try { await api.patch('/physiotherapist/me', { first_name: profile.profiles.first_name, last_name: profile.profiles.last_name, phone: profile.profiles.phone, professional_title: profile.professional_title, specialization: profile.specialization, biography: profile.biography, years_of_experience: profile.years_of_experience, consultation_duration: profile.consultation_duration, profile_image: profile.profile_image, is_accepting_patients: profile.is_accepting_patients }); setMessage('Profile updated') }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update profile') }
  }
  async function addHours(event) {
    event.preventDefault()
    try { await api.post('/physiotherapist/availability', newHours); setMessage('Availability added'); setNewHours(blankHours); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to add availability') }
  }
  async function removeHours(id) { try { await api.delete(`/physiotherapist/availability/${id}`); await load() } catch (e) { setError(e.response?.data?.message || 'Unable to remove availability') } }
  async function status(id, value) { try { await api.patch(`/physiotherapist/appointments/${id}/status`, { status: value }); setMessage('Appointment updated'); await load() } catch (e) { setError(e.response?.data?.message || 'Unable to update appointment') } }

  const today = new Date().toDateString()
  const todayVisits = appointments.filter((a) => new Date(a.starts_at).toDateString() === today)
  const upcoming = appointments.filter((a) => new Date(a.starts_at) >= new Date() && ['pending','confirmed'].includes(a.status))
  return <DashboardLayout role="Physiotherapist" title="Clinical workspace" subtitle="Plan your week, review patients, and keep every appointment moving.">
    <nav className="dashboard-tabs">{['schedule','appointments','patients','availability','profile'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav><Notice value={error || message} error={Boolean(error)} />
    {tab === 'schedule' && <><section className="stat-grid stat-grid--three"><article><span>Today</span><strong>{todayVisits.length}</strong><small>appointments</small></article><article><span>Upcoming</span><strong>{upcoming.length}</strong><small>active bookings</small></article><article><span>Patients</span><strong>{patients.length}</strong><small>authorized records</small></article></section><AppointmentPanel rows={todayVisits.length ? todayVisits : upcoming.slice(0,5)} onStatus={status} title={todayVisits.length ? "Today's schedule" : 'Next appointments'} /></>}
    {tab === 'appointments' && <AppointmentPanel rows={appointments} onStatus={status} title="All appointments" />}
    {tab === 'patients' && <section className="panel"><div className="panel-heading"><div><h2>My patients</h2><p>Patients assigned to you or with a treatment appointment.</p></div></div><div className="person-grid">{patients.map((p) => <article className="person-row" key={p.id}><div className="avatar avatar--large">{p.first_name[0]}{p.last_name[0]}</div><div><strong>{p.first_name} {p.last_name}</strong><span>{p.email}</span><small>{p.phone || 'No phone'} · Record {p.medical_record_number || 'not set'}</small></div></article>)}</div>{!patients.length && <div className="empty">No authorized patients yet.</div>}</section>}
    {tab === 'availability' && <div className="split-grid"><section className="panel"><div className="panel-heading"><div><h2>Weekly hours</h2><p>Active hours generate patient booking slots.</p></div></div>{hours.map((h) => <article className="hours-row" key={h.id}><strong>{h.day_of_week}</strong><span>{h.start_time.slice(0,5)} – {h.end_time.slice(0,5)}</span><small>{h.slot_duration_minutes} min slots</small><button className="text-button text-button--danger" onClick={() => removeHours(h.id)}>Remove</button></article>)}{!hours.length && <div className="empty">Add your first working period.</div>}</section><form className="panel stack" onSubmit={addHours}><h2>Add working hours</h2><label><span>Day</span><select value={newHours.day_of_week} onChange={(e) => setNewHours({ ...newHours, day_of_week: e.target.value })}>{['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d) => <option key={d}>{d}</option>)}</select></label><label><span>Starts</span><input type="time" value={newHours.start_time} onChange={(e) => setNewHours({ ...newHours, start_time: e.target.value })} required /></label><label><span>Ends</span><input type="time" value={newHours.end_time} onChange={(e) => setNewHours({ ...newHours, end_time: e.target.value })} required /></label><label><span>Slot duration (minutes)</span><input type="number" min="5" value={newHours.slot_duration_minutes} onChange={(e) => setNewHours({ ...newHours, slot_duration_minutes: Number(e.target.value) })} required /></label><button className="button">Add period</button></form></div>}
    {tab === 'profile' && profile && <form className="panel form-grid" onSubmit={saveProfile}><div className="panel-heading full"><div><h2>Professional profile</h2><p>This information appears in the patient directory.</p></div></div>{['first_name','last_name','phone'].map((key) => <label key={key}><span>{key.replace('_',' ')}</span><input value={profile.profiles[key] || ''} onChange={(e) => setProfile({ ...profile, profiles: { ...profile.profiles, [key]: e.target.value } })} /></label>)}{['professional_title','specialization','years_of_experience','consultation_duration','profile_image'].map((key) => <label key={key}><span>{key.replaceAll('_',' ')}</span><input type={key.includes('experience') || key.includes('duration') ? 'number' : 'text'} value={profile[key] || ''} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} /></label>)}<label className="full"><span>Biography</span><textarea value={profile.biography || ''} onChange={(e) => setProfile({ ...profile, biography: e.target.value })} /></label><label className="check full"><input type="checkbox" checked={profile.is_accepting_patients} onChange={(e) => setProfile({ ...profile, is_accepting_patients: e.target.checked })} /> Accepting new patients</label><button className="button full">Save profile</button></form>}
  </DashboardLayout>
}

function AppointmentPanel({ rows, onStatus, title }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2><p>Only appointments booked with your account are shown.</p></div></div><div className="appointment-list">{rows.map((a) => <article key={a.id}><div className="date-tile"><strong>{new Date(a.starts_at).getDate()}</strong><span>{new Date(a.starts_at).toLocaleString('en', { month: 'short' })}</span></div><div><strong>{a.profiles.first_name} {a.profiles.last_name}</strong><span>{a.treatment_type}</span><small>{new Date(a.starts_at).toLocaleString()}</small></div><span className={`badge ${a.status === 'confirmed' ? 'badge--green' : ''}`}>{a.status}</span><div className="action-row">{a.status === 'pending' && <><button className="text-button" onClick={() => onStatus(a.id, 'confirmed')}>Confirm</button><button className="text-button text-button--danger" onClick={() => onStatus(a.id, 'rejected')}>Reject</button></>}{a.status === 'confirmed' && <><button className="text-button" onClick={() => onStatus(a.id, 'completed')}>Complete</button><button className="text-button" onClick={() => onStatus(a.id, 'no_show')}>No show</button></>}</div></article>)}{!rows.length && <div className="empty">No appointments to show.</div>}</div></section>
}
