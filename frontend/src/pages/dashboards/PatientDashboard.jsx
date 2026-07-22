import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'

export default function PatientDashboard() {
  const [clinicians, setClinicians] = useState([])
  const [appointments, setAppointments] = useState([])
  const [selected, setSelected] = useState(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [booking, setBooking] = useState({ starts_at: '', treatment_type: '', patient_notes: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try { const [people, visits] = await Promise.all([api.get('/physiotherapists'), api.get('/appointments/my')]); setClinicians(people.data.data); setAppointments(visits.data.data) }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load dashboard') }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!selected || !date) return setSlots([])
    api.get(`/physiotherapists/${selected.profile_id}/available-slots`, { params: { date } }).then((r) => setSlots(r.data.data)).catch((e) => setError(e.response?.data?.message || 'Unable to load slots'))
  }, [selected, date])
  async function submit(event) {
    event.preventDefault(); setError('')
    try { const response = await api.post('/appointments', { ...booking, physiotherapist_id: selected.profile_id }); setMessage(response.data.message); setSelected(null); setDate(''); setBooking({ starts_at: '', treatment_type: '', patient_notes: '' }); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to book appointment') }
  }
  async function cancel(id) {
    try { await api.patch(`/appointments/${id}/cancel`); setMessage('Appointment cancelled'); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to cancel') }
  }

  const upcoming = appointments.filter((a) => ['pending','confirmed'].includes(a.status) && new Date(a.starts_at) > new Date())
  return <DashboardLayout role="Patient" title="Your care, in one place" subtitle="Meet the clinic team and arrange appointments around your schedule.">
    <Notice value={error || message} error={Boolean(error)} />
    {upcoming.length > 0 && <section className="panel"><div className="panel-heading"><div><h2>Upcoming appointments</h2><p>Your pending and confirmed visits.</p></div></div><div className="appointment-list">{upcoming.map((a) => <article key={a.id}><div className="date-tile"><strong>{new Date(a.starts_at).getDate()}</strong><span>{new Date(a.starts_at).toLocaleString('en', { month: 'short' })}</span></div><div><strong>{a.treatment_type}</strong><span>with {a.profiles.first_name} {a.profiles.last_name}</span><small>{new Date(a.starts_at).toLocaleString()}</small></div><span className="badge badge--green">{a.status}</span><button className="text-button text-button--danger" onClick={() => cancel(a.id)}>Cancel</button></article>)}</div></section>}
    <section><div className="section-heading"><div><p className="eyebrow">Our clinical team</p><h2>Choose your physiotherapist</h2></div><p>All professionals shown are active and accepting appointments.</p></div><div className="clinician-grid">{clinicians.map((c) => <article className="clinician-card" key={c.profile_id}><div className="clinician-photo">{c.profile_image ? <img src={c.profile_image} alt="" /> : <span>{c.profiles.first_name[0]}{c.profiles.last_name[0]}</span>}<span className="available-dot">Available</span></div><div className="clinician-body"><p className="eyebrow">{c.professional_title}</p><h3>{c.profiles.first_name} {c.profiles.last_name}</h3><strong className="specialty">{c.specialization}</strong><p>{c.biography || 'Dedicated to helping patients move comfortably and confidently.'}</p><div className="clinician-facts"><span><strong>{c.years_of_experience}</strong> years</span><span><strong>{c.consultation_duration}</strong> min</span></div><button className="button" onClick={() => { setSelected(c); setMessage(''); setError('') }}>Book appointment</button></div></article>)}</div></section>
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}><button className="modal-close" type="button" onClick={() => setSelected(null)}>×</button><p className="eyebrow">Appointment request</p><h2>{selected.profiles.first_name} {selected.profiles.last_name}</h2><p>{selected.specialization} · {selected.consultation_duration} minutes</p><label><span>Date</span><input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={(e) => { setDate(e.target.value); setBooking({ ...booking, starts_at: '' }) }} required /></label><label><span>Available time</span><select value={booking.starts_at} onChange={(e) => setBooking({ ...booking, starts_at: e.target.value })} required><option value="">{date ? 'Select a time' : 'Choose a date first'}</option>{slots.map((slot) => <option key={slot.starts_at} value={slot.starts_at}>{new Date(slot.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>)}</select></label><label><span>Treatment type</span><input value={booking.treatment_type} onChange={(e) => setBooking({ ...booking, treatment_type: e.target.value })} placeholder="e.g. Initial assessment" required /></label><label><span>Reason or notes</span><textarea value={booking.patient_notes} onChange={(e) => setBooking({ ...booking, patient_notes: e.target.value })} placeholder="Tell your physiotherapist what brings you in" /></label><button className="button" type="submit">Request appointment</button></form></div>}
  </DashboardLayout>
}
