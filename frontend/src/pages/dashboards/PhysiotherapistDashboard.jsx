import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'
import './PhysiotherapistDashboard.css'

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const blankHours = { day_of_week: 'monday', start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 }
const blankTimeOff = { start_datetime: '', end_datetime: '', reason: '' }

function timeValue(value = '') {
  return value.slice(0, 5)
}

function validateHours(period, existingPeriods, ignoredId) {
  const start = timeValue(period.start_time)
  const end = timeValue(period.end_time)
  const duration = Number(period.slot_duration_minutes)

  if (!start || !end || start >= end) return 'End time must be later than start time'
  if (!Number.isFinite(duration) || duration < 5) return 'Slot duration must be at least 5 minutes'

  const overlaps = period.is_active !== false && existingPeriods.some((item) => (
    item.id !== ignoredId
    && item.day_of_week === period.day_of_week
    && item.is_active !== false
    && start < timeValue(item.end_time)
    && end > timeValue(item.start_time)
  ))
  if (overlaps) return `This period overlaps another ${period.day_of_week} period`
  return ''
}

function asUtcIso(value) {
  return new Date(`${value}:00Z`).toISOString()
}

function formatUtcDateTime(value) {
  return `${new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`
}

function formatDay(day) {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

export default function PhysiotherapistDashboard() {
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [hours, setHours] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [newHours, setNewHours] = useState(blankHours)
  const [newTimeOff, setNewTimeOff] = useState(blankTimeOff)
  const [tab, setTab] = useState('schedule')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [savingHoursId, setSavingHoursId] = useState('')

  async function load() {
    try {
      const [me, visits, patientList, availability, exceptions] = await Promise.all([
        api.get('/physiotherapist/me'),
        api.get('/physiotherapist/appointments'),
        api.get('/physiotherapist/patients'),
        api.get('/physiotherapist/availability'),
        api.get('/physiotherapist/time-off'),
      ])
      setProfile(me.data.data)
      setAppointments(visits.data.data)
      setPatients(patientList.data.data)
      setHours(availability.data.data)
      setTimeOff(exceptions.data.data)
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
    setError('')
    setMessage('')
    const validationError = validateHours(newHours, hours)
    if (validationError) return setError(validationError)
    try {
      await api.post('/physiotherapist/availability', newHours)
      setMessage('Availability added')
      setNewHours({ ...blankHours, slot_duration_minutes: profile?.consultation_duration || 30 })
      await load()
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to add availability') }
  }
  function changeHours(id, field, value) {
    setHours((current) => current.map((period) => (
      period.id === id ? { ...period, [field]: value } : period
    )))
  }
  async function saveHours(id) {
    const period = hours.find((item) => item.id === id)
    const validationError = validateHours(period, hours, id)
    setError('')
    setMessage('')
    if (validationError) return setError(validationError)

    setSavingHoursId(id)
    try {
      await api.patch(`/physiotherapist/availability/${id}`, {
        day_of_week: period.day_of_week,
        start_time: timeValue(period.start_time),
        end_time: timeValue(period.end_time),
        slot_duration_minutes: Number(period.slot_duration_minutes),
        is_active: period.is_active,
      })
      setMessage('Availability updated')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update availability')
    } finally {
      setSavingHoursId('')
    }
  }
  async function toggleHours(id, isActive) {
    setError('')
    setMessage('')
    setSavingHoursId(id)
    try {
      await api.patch(`/physiotherapist/availability/${id}`, { is_active: isActive })
      setHours((current) => current.map((period) => (
        period.id === id ? { ...period, is_active: isActive } : period
      )))
      setMessage(isActive ? 'Working period enabled' : 'Working period paused')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update availability')
    } finally {
      setSavingHoursId('')
    }
  }
  async function removeHours(id) {
    setError('')
    setMessage('')
    try {
      await api.delete(`/physiotherapist/availability/${id}`)
      setMessage('Availability removed')
      await load()
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to remove availability') }
  }
  async function addTimeOff(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!newTimeOff.start_datetime || !newTimeOff.end_datetime || newTimeOff.start_datetime >= newTimeOff.end_datetime) {
      return setError('Time off must end after it starts')
    }
    try {
      await api.post('/physiotherapist/time-off', {
        start_datetime: asUtcIso(newTimeOff.start_datetime),
        end_datetime: asUtcIso(newTimeOff.end_datetime),
        reason: newTimeOff.reason.trim(),
      })
      setMessage('Time off added')
      setNewTimeOff(blankTimeOff)
      await load()
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to add time off') }
  }
  async function removeTimeOff(id) {
    setError('')
    setMessage('')
    try {
      await api.delete(`/physiotherapist/time-off/${id}`)
      setMessage('Time off removed')
      await load()
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to remove time off') }
  }
  async function status(id, value) { try { await api.patch(`/physiotherapist/appointments/${id}/status`, { status: value }); setMessage('Appointment updated'); await load() } catch (e) { setError(e.response?.data?.message || 'Unable to update appointment') } }

  const today = new Date().toISOString().slice(0, 10)
  const todayVisits = appointments.filter((a) => a.starts_at.slice(0, 10) === today)
  const upcoming = appointments.filter((a) => new Date(a.starts_at) >= new Date() && ['pending','confirmed'].includes(a.status))
  const sortedHours = [...hours].sort((a, b) => (
    weekDays.indexOf(a.day_of_week) - weekDays.indexOf(b.day_of_week)
    || timeValue(a.start_time).localeCompare(timeValue(b.start_time))
  ))
  return <DashboardLayout role="Physiotherapist" title="Clinical workspace" subtitle="Plan your week, review patients, and keep every appointment moving.">
    <nav className="dashboard-tabs">{['schedule','appointments','patients','availability','profile'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav><Notice value={error || message} error={Boolean(error)} />
    {tab === 'schedule' && <><section className="stat-grid stat-grid--three"><article><span>Today</span><strong>{todayVisits.length}</strong><small>appointments</small></article><article><span>Upcoming</span><strong>{upcoming.length}</strong><small>active bookings</small></article><article><span>Patients</span><strong>{patients.length}</strong><small>authorized records</small></article></section><AppointmentPanel rows={todayVisits.length ? todayVisits : upcoming.slice(0,5)} onStatus={status} title={todayVisits.length ? "Today's schedule" : 'Next appointments'} /></>}
    {tab === 'appointments' && <AppointmentPanel rows={appointments} onStatus={status} title="All appointments" />}
    {tab === 'patients' && <section className="panel"><div className="panel-heading"><div><h2>My patients</h2><p>Patients assigned to you or with a treatment appointment.</p></div></div><div className="person-grid">{patients.map((p) => <article className="person-row" key={p.id}><div className="avatar avatar--large">{p.first_name[0]}{p.last_name[0]}</div><div><strong>{p.first_name} {p.last_name}</strong><span>{p.email}</span><small>{p.phone || 'No phone'} · Record {p.medical_record_number || 'not set'}</small></div></article>)}</div>{!patients.length && <div className="empty">No authorized patients yet.</div>}</section>}
    {tab === 'availability' && <AvailabilityTab
      hours={sortedHours}
      newHours={newHours}
      setNewHours={setNewHours}
      onAddHours={addHours}
      onChangeHours={changeHours}
      onSaveHours={saveHours}
      onToggleHours={toggleHours}
      onRemoveHours={removeHours}
      savingHoursId={savingHoursId}
      timeOff={timeOff}
      newTimeOff={newTimeOff}
      setNewTimeOff={setNewTimeOff}
      onAddTimeOff={addTimeOff}
      onRemoveTimeOff={removeTimeOff}
    />}
    {tab === 'profile' && profile && <form className="panel form-grid" onSubmit={saveProfile}><div className="panel-heading full"><div><h2>Professional profile</h2><p>This information appears in the patient directory.</p></div></div>{['first_name','last_name','phone'].map((key) => <label key={key}><span>{key.replace('_',' ')}</span><input value={profile.profiles[key] || ''} onChange={(e) => setProfile({ ...profile, profiles: { ...profile.profiles, [key]: e.target.value } })} /></label>)}{['professional_title','specialization','years_of_experience','consultation_duration','profile_image'].map((key) => <label key={key}><span>{key.replaceAll('_',' ')}</span><input type={key.includes('experience') || key.includes('duration') ? 'number' : 'text'} value={profile[key] || ''} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} /></label>)}<label className="full"><span>Biography</span><textarea value={profile.biography || ''} onChange={(e) => setProfile({ ...profile, biography: e.target.value })} /></label><label className="check full"><input type="checkbox" checked={profile.is_accepting_patients} onChange={(e) => setProfile({ ...profile, is_accepting_patients: e.target.checked })} /> Accepting new patients</label><button className="button full">Save profile</button></form>}
  </DashboardLayout>
}

function AvailabilityTab({
  hours,
  newHours,
  setNewHours,
  onAddHours,
  onChangeHours,
  onSaveHours,
  onToggleHours,
  onRemoveHours,
  savingHoursId,
  timeOff,
  newTimeOff,
  setNewTimeOff,
  onAddTimeOff,
  onRemoveTimeOff,
}) {
  return <div className="availability-workspace">
    <section className="panel availability-week">
      <div className="panel-heading">
        <div>
          <h2>Weekly hours</h2>
          <p>Set the recurring periods that generate patient booking slots.</p>
        </div>
        <span className="clinic-time-label">Clinic time · UTC</span>
      </div>
      <div className="availability-days">
        {weekDays.map((day) => {
          const periods = hours.filter((period) => period.day_of_week === day)
          return <section className="availability-day" key={day}>
            <div className="availability-day__heading">
              <strong>{formatDay(day)}</strong>
              <small>{periods.length ? `${periods.length} ${periods.length === 1 ? 'period' : 'periods'}` : 'Unavailable'}</small>
            </div>
            <div className="availability-day__periods">
              {periods.map((period) => <article className={`availability-period ${period.is_active === false ? 'availability-period--paused' : ''}`} key={period.id}>
                <label className="availability-toggle">
                  <input
                    type="checkbox"
                    checked={period.is_active !== false}
                    disabled={savingHoursId === period.id}
                    onChange={(event) => onToggleHours(period.id, event.target.checked)}
                  />
                  <span>{period.is_active === false ? 'Paused' : 'Active'}</span>
                </label>
                <label>
                  <span>Day</span>
                  <select value={period.day_of_week} onChange={(event) => onChangeHours(period.id, 'day_of_week', event.target.value)}>
                    {weekDays.map((option) => <option key={option} value={option}>{formatDay(option)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Starts</span>
                  <input type="time" value={timeValue(period.start_time)} onChange={(event) => onChangeHours(period.id, 'start_time', event.target.value)} required />
                </label>
                <label>
                  <span>Ends</span>
                  <input type="time" value={timeValue(period.end_time)} onChange={(event) => onChangeHours(period.id, 'end_time', event.target.value)} required />
                </label>
                <label>
                  <span>Slot minutes</span>
                  <input type="number" min="5" step="5" value={period.slot_duration_minutes} onChange={(event) => onChangeHours(period.id, 'slot_duration_minutes', Number(event.target.value))} required />
                </label>
                <div className="availability-period__actions">
                  <button className="text-button" type="button" disabled={savingHoursId === period.id} onClick={() => onSaveHours(period.id)}>
                    {savingHoursId === period.id ? 'Saving…' : 'Save'}
                  </button>
                  <button className="text-button text-button--danger" type="button" onClick={() => onRemoveHours(period.id)}>Remove</button>
                </div>
              </article>)}
            </div>
          </section>
        })}
      </div>
    </section>

    <div className="availability-sidebar">
      <form className="panel stack availability-form" onSubmit={onAddHours}>
        <div>
          <h2>Add working period</h2>
          <p>Times are entered in clinic time (UTC).</p>
        </div>
        <label>
          <span>Day</span>
          <select value={newHours.day_of_week} onChange={(event) => setNewHours({ ...newHours, day_of_week: event.target.value })}>
            {weekDays.map((day) => <option key={day} value={day}>{formatDay(day)}</option>)}
          </select>
        </label>
        <div className="availability-form__times">
          <label>
            <span>Starts</span>
            <input type="time" value={newHours.start_time} onChange={(event) => setNewHours({ ...newHours, start_time: event.target.value })} required />
          </label>
          <label>
            <span>Ends</span>
            <input type="time" value={newHours.end_time} onChange={(event) => setNewHours({ ...newHours, end_time: event.target.value })} required />
          </label>
        </div>
        <label>
          <span>Slot duration (minutes)</span>
          <input type="number" min="5" step="5" value={newHours.slot_duration_minutes} onChange={(event) => setNewHours({ ...newHours, slot_duration_minutes: Number(event.target.value) })} required />
        </label>
        <button className="button">Add period</button>
      </form>

      <form className="panel stack availability-form" onSubmit={onAddTimeOff}>
        <div>
          <h2>Add time off</h2>
          <p>Block an exception without changing your recurring week. Times use UTC.</p>
        </div>
        <label>
          <span>Starts</span>
          <input type="datetime-local" value={newTimeOff.start_datetime} onChange={(event) => setNewTimeOff({ ...newTimeOff, start_datetime: event.target.value })} required />
        </label>
        <label>
          <span>Ends</span>
          <input type="datetime-local" value={newTimeOff.end_datetime} onChange={(event) => setNewTimeOff({ ...newTimeOff, end_datetime: event.target.value })} required />
        </label>
        <label>
          <span>Reason (optional)</span>
          <input value={newTimeOff.reason} maxLength="180" onChange={(event) => setNewTimeOff({ ...newTimeOff, reason: event.target.value })} placeholder="Holiday, training, personal…" />
        </label>
        <button className="button">Block time</button>
      </form>
    </div>

    <section className="panel availability-exceptions">
      <div className="panel-heading">
        <div>
          <h2>Time-off exceptions</h2>
          <p>These blocks are removed from otherwise available appointment times.</p>
        </div>
      </div>
      <div className="availability-exception-list">
        {timeOff.map((item) => <article key={item.id}>
          <div>
            <strong>{item.reason || 'Unavailable'}</strong>
            <span>{formatUtcDateTime(item.start_datetime)} – {formatUtcDateTime(item.end_datetime)}</span>
          </div>
          <button className="text-button text-button--danger" type="button" onClick={() => onRemoveTimeOff(item.id)}>Remove</button>
        </article>)}
        {!timeOff.length && <div className="empty">No time-off exceptions.</div>}
      </div>
    </section>
  </div>
}

function AppointmentPanel({ rows, onStatus, title }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2><p>Only appointments booked with your account are shown.</p></div></div><div className="appointment-list">{rows.map((a) => <article key={a.id}><div className="date-tile"><strong>{new Date(a.starts_at).toLocaleString('en', { day: 'numeric', timeZone: 'UTC' })}</strong><span>{new Date(a.starts_at).toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</span></div><div><strong>{a.profiles.first_name} {a.profiles.last_name}</strong><span>{a.treatment_type}</span><small>{formatUtcDateTime(a.starts_at)}</small></div><span className={`badge ${a.status === 'confirmed' ? 'badge--green' : ''}`}>{a.status}</span><div className="action-row">{a.status === 'pending' && <><button className="text-button" onClick={() => onStatus(a.id, 'confirmed')}>Confirm</button><button className="text-button text-button--danger" onClick={() => onStatus(a.id, 'rejected')}>Reject</button></>}{a.status === 'confirmed' && <><button className="text-button" onClick={() => onStatus(a.id, 'completed')}>Complete</button><button className="text-button" onClick={() => onStatus(a.id, 'no_show')}>No show</button></>}</div></article>)}{!rows.length && <div className="empty">No appointments to show.</div>}</div></section>
}
