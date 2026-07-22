import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'

const emptyClinician = { first_name: '', last_name: '', email: '', phone: '', password: '', professional_title: '', license_number: '', specialization: '', biography: '', years_of_experience: 0, consultation_duration: 30, profile_image: '', is_accepting_patients: true }

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [patients, setPatients] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState(emptyClinician)
  const [assignment, setAssignment] = useState({ patient_id: '', physiotherapist_id: '' })
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summary, patientList, clinicianList, assignmentList] = await Promise.all([
        api.get('/admin/dashboard'), api.get('/admin/patients', { params: { search } }), api.get('/admin/physiotherapists'), api.get('/admin/patient-assignments'),
      ])
      setStats(summary.data.data); setPatients(patientList.data.data); setClinicians(clinicianList.data.data); setAssignments(assignmentList.data.data)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load dashboard') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { const timer = setTimeout(load, search ? 250 : 0); return () => clearTimeout(timer) }, [load, search])

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }
  async function createClinician(event) {
    event.preventDefault(); setError(''); setMessage('')
    try { const response = await api.post('/admin/physiotherapists', form); setMessage(response.data.message); setForm(emptyClinician); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create physiotherapist') }
  }
  async function toggleAccount(person, role) {
    setError(''); const id = person.profile_id || person.id; const active = person.profiles?.is_active ?? person.is_active
    try { await api.patch(`/admin/${role}/${id}`, { is_active: !active }); setMessage(`Account ${active ? 'disabled' : 'enabled'}`); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update account') }
  }
  async function assignPatient(event) {
    event.preventDefault(); setError('')
    try { const response = await api.post('/admin/patient-assignments', assignment); setMessage(response.data.message); setAssignment({ patient_id: '', physiotherapist_id: '' }); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to assign patient') }
  }
  async function endAssignment(id) {
    try { await api.delete(`/admin/patient-assignments/${id}`); setMessage('Assignment ended'); await load() }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to end assignment') }
  }

  return <DashboardLayout role="Administrator" title="Clinic operations" subtitle="Manage your care team, patients, assignments, and appointment activity.">
    <nav className="dashboard-tabs">{['overview','patients','physiotherapists','assignments'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
    <Notice value={error || message} error={Boolean(error)} />
    {loading && <div className="panel">Loading clinic data…</div>}
    {!loading && tab === 'overview' && <>
      <section className="stat-grid">
        <article><span>Patients</span><strong>{stats.totalPatients || 0}</strong><small>Active accounts</small></article>
        <article><span>Physiotherapists</span><strong>{stats.totalPhysiotherapists || 0}</strong><small>Active clinicians</small></article>
        <article><span>Appointments</span><strong>{stats.totalAppointments || 0}</strong><small>All time</small></article>
        <article className="stat--amber"><span>Pending</span><strong>{stats.pendingAppointments || 0}</strong><small>Needs review</small></article>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Current assignments</h2><p>Active patient-to-clinician care relationships.</p></div><button className="button" onClick={() => setTab('assignments')}>Manage assignments</button></div><AssignmentTable rows={assignments} onEnd={endAssignment} /></section>
    </>}
    {!loading && tab === 'patients' && <section className="panel"><div className="panel-heading"><div><h2>Patients</h2><p>Search and manage patient access.</p></div><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or record #" /></div><div className="table-wrap"><table><thead><tr><th>Patient</th><th>Contact</th><th>Record</th><th>Status</th><th /></tr></thead><tbody>{patients.map((p) => <tr key={p.id}><td><strong>{p.first_name} {p.last_name}</strong><small>{p.email}</small></td><td>{p.phone || '—'}</td><td>{p.medical_record_number || '—'}</td><td><span className={`badge ${p.is_active ? 'badge--green' : ''}`}>{p.is_active ? 'Active' : 'Disabled'}</span></td><td><button className="text-button" onClick={() => toggleAccount(p, 'patients')}>{p.is_active ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div></section>}
    {!loading && tab === 'physiotherapists' && <div className="split-grid"><section className="panel"><div className="panel-heading"><div><h2>Care team</h2><p>{clinicians.length} clinician accounts</p></div></div>{clinicians.map((c) => <article className="person-row" key={c.id}><div className="avatar avatar--large">{c.profiles.first_name[0]}{c.profiles.last_name[0]}</div><div><strong>{c.profiles.first_name} {c.profiles.last_name}</strong><span>{c.professional_title} · {c.specialization}</span><small>License {c.license_number}</small></div><button className="text-button" onClick={() => toggleAccount(c, 'physiotherapists')}>{c.profiles.is_active ? 'Disable' : 'Enable'}</button></article>)}</section>
      <form className="panel form-grid" onSubmit={createClinician}><div className="panel-heading full"><div><h2>Add physiotherapist</h2><p>Create a secure clinician account.</p></div></div>{Object.keys(emptyClinician).filter((key) => !['biography','is_accepting_patients'].includes(key)).map((key) => <label key={key}><span>{key.replaceAll('_',' ')}</span><input name={key} type={key === 'password' ? 'password' : key.includes('experience') || key.includes('duration') ? 'number' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={updateForm} required={!['profile_image'].includes(key)} /></label>)}<label className="full"><span>Biography</span><textarea name="biography" value={form.biography} onChange={updateForm} /></label><label className="check full"><input type="checkbox" name="is_accepting_patients" checked={form.is_accepting_patients} onChange={updateForm} /> Accepting new patients</label><button className="button full" type="submit">Create physiotherapist</button></form></div>}
    {!loading && tab === 'assignments' && <div className="split-grid"><section className="panel"><div className="panel-heading"><div><h2>Active assignments</h2><p>Care relationships are retained as history when ended.</p></div></div><AssignmentTable rows={assignments} onEnd={endAssignment} /></section><form className="panel stack" onSubmit={assignPatient}><h2>Assign a patient</h2><label><span>Patient</span><select value={assignment.patient_id} onChange={(e) => setAssignment({ ...assignment, patient_id: e.target.value })} required><option value="">Select patient</option>{patients.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></label><label><span>Physiotherapist</span><select value={assignment.physiotherapist_id} onChange={(e) => setAssignment({ ...assignment, physiotherapist_id: e.target.value })} required><option value="">Select clinician</option>{clinicians.filter((c) => c.profiles.is_active).map((c) => <option key={c.profile_id} value={c.profile_id}>{c.profiles.first_name} {c.profiles.last_name}</option>)}</select></label><button className="button" type="submit">Create assignment</button></form></div>}
  </DashboardLayout>
}

function AssignmentTable({ rows, onEnd }) {
  if (!rows.length) return <div className="empty">No active assignments yet.</div>
  return <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Physiotherapist</th><th>Assigned</th><th /></tr></thead><tbody>{rows.map((a) => <tr key={a.id}><td>{a.patient.first_name} {a.patient.last_name}<small>{a.patient.email}</small></td><td>{a.physiotherapist.first_name} {a.physiotherapist.last_name}</td><td>{new Date(a.assigned_at).toLocaleDateString()}</td><td><button className="text-button text-button--danger" onClick={() => onEnd(a.id)}>End</button></td></tr>)}</tbody></table></div>
}
