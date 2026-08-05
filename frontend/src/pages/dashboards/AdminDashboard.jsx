import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { localeFor } from '../../i18n/formatters.js'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'

const emptyClinician = {
  first_name: '',
  last_name: '',
  gender: '',
  email: '',
  phone: '',
  password: '',
  professional_title: '',
  license_number: '',
  specialization: '',
  biography: '',
  years_of_experience: 0,
  consultation_duration: 30,
  profile_image: '',
  is_accepting_patients: true,
}

const TABS = ['overview', 'patients', 'physiotherapists', 'assignments']

const CLINICIAN_FIELDS = [
  {
    name: 'first_name',
    labelKey: 'common:fields.firstName',
    placeholderKey: 'form.placeholders.firstName',
    autoComplete: 'given-name',
  },
  {
    name: 'last_name',
    labelKey: 'common:fields.lastName',
    placeholderKey: 'form.placeholders.lastName',
    autoComplete: 'family-name',
  },
  { name: 'gender', kind: 'gender' },
  {
    name: 'email',
    labelKey: 'common:fields.email',
    placeholderKey: 'form.placeholders.email',
    type: 'email',
    autoComplete: 'email',
    direction: 'ltr',
  },
  {
    name: 'phone',
    labelKey: 'common:fields.phone',
    placeholderKey: 'form.placeholders.phone',
    type: 'tel',
    autoComplete: 'tel',
    direction: 'ltr',
  },
  {
    name: 'password',
    labelKey: 'common:fields.password',
    placeholderKey: 'form.placeholders.password',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    name: 'professional_title',
    labelKey: 'common:fields.professionalTitle',
    placeholderKey: 'form.placeholders.professionalTitle',
  },
  {
    name: 'license_number',
    labelKey: 'common:fields.licenseNumber',
    placeholderKey: 'form.placeholders.licenseNumber',
    direction: 'ltr',
  },
  {
    name: 'specialization',
    labelKey: 'common:fields.specialization',
    placeholderKey: 'form.placeholders.specialization',
  },
  {
    name: 'years_of_experience',
    labelKey: 'common:fields.yearsOfExperience',
    placeholderKey: 'form.placeholders.yearsOfExperience',
    type: 'number',
    inputMode: 'numeric',
  },
  {
    name: 'consultation_duration',
    labelKey: 'common:fields.consultationDuration',
    placeholderKey: 'form.placeholders.consultationDuration',
    type: 'number',
    inputMode: 'numeric',
  },
  {
    name: 'profile_image',
    labelKey: 'common:fields.profileImage',
    placeholderKey: 'form.placeholders.profileImage',
    required: false,
    direction: 'ltr',
  },
]

const API_ERROR_KEYS = {
  'Gender must be female or male': 'errors.invalidGender',
  'Patient not found': 'errors.patientNotFound',
  'Physiotherapist not found': 'errors.physiotherapistNotFound',
  'Password must be at least 8 characters': 'errors.passwordLength',
  'Email or license number already exists': 'errors.duplicateClinician',
  'Patient already has an active assignment': 'errors.duplicateAssignment',
  'Active assignment not found': 'errors.assignmentNotFound',
  'Required fields are missing': 'errors.requiredFields',
}

function apiErrorDescriptor(requestError, fallbackKey) {
  if (!requestError.response) return { key: 'common:errors.network' }
  if (requestError.response.status === 401) return { key: 'common:errors.session' }

  const responseMessage = requestError.response?.data?.message
  return { key: API_ERROR_KEYS[responseMessage] || fallbackKey }
}

function clinicianGender(clinician) {
  return clinician.profiles?.gender || clinician.gender || ''
}

function personName(t, person = {}) {
  return t('shared.personName', {
    firstName: person.first_name || '',
    lastName: person.last_name || '',
  }).trim()
}

function initials(person = {}) {
  return `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const locale = localeFor(i18n.resolvedLanguage)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [patients, setPatients] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState(emptyClinician)
  const [assignment, setAssignment] = useState({
    patient_id: '',
    physiotherapist_id: '',
  })
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [creatingClinician, setCreatingClinician] = useState(false)
  const [assigningPatient, setAssigningPatient] = useState(false)
  const [endingAssignmentId, setEndingAssignmentId] = useState('')
  const [updatingAccountId, setUpdatingAccountId] = useState('')
  const [updatingGenderId, setUpdatingGenderId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, patientList, clinicianList, assignmentList] =
        await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/patients', { params: { search } }),
          api.get('/admin/physiotherapists'),
          api.get('/admin/patient-assignments'),
        ])
      setStats(summary.data.data)
      setPatients(patientList.data.data)
      setClinicians(clinicianList.data.data)
      setAssignments(assignmentList.data.data)
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.loadDashboard'))
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function clearNotices() {
    setError(null)
    setMessage(null)
  }

  async function createClinician(event) {
    event.preventDefault()
    clearNotices()
    setCreatingClinician(true)
    try {
      await api.post('/admin/physiotherapists', form)
      setMessage({ key: 'success.clinicianCreated' })
      setForm(emptyClinician)
      await load()
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.createClinician'))
    } finally {
      setCreatingClinician(false)
    }
  }

  async function toggleAccount(person, role) {
    clearNotices()
    const id = person.profile_id || person.id
    const active = person.profiles?.is_active ?? person.is_active
    const actionId = `${role}:${id}`
    setUpdatingAccountId(actionId)
    try {
      await api.patch(`/admin/${role}/${id}`, { is_active: !active })
      setMessage({
        key: active ? 'success.accountDisabled' : 'success.accountEnabled',
      })
      await load()
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.updateAccount'))
    } finally {
      setUpdatingAccountId('')
    }
  }

  async function updateClinicianGender(person, gender) {
    clearNotices()
    setUpdatingGenderId(person.profile_id)
    try {
      await api.patch(`/admin/physiotherapists/${person.profile_id}`, {
        gender,
      })
      setMessage({
        key: 'success.genderUpdated',
        values: { name: personName(t, person.profiles) },
      })
      await load()
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.updateGender'))
    } finally {
      setUpdatingGenderId('')
    }
  }

  async function assignPatient(event) {
    event.preventDefault()
    clearNotices()
    setAssigningPatient(true)
    try {
      await api.post('/admin/patient-assignments', assignment)
      setMessage({ key: 'success.assignmentCreated' })
      setAssignment({ patient_id: '', physiotherapist_id: '' })
      await load()
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.assignPatient'))
    } finally {
      setAssigningPatient(false)
    }
  }

  async function endAssignment(id) {
    clearNotices()
    setEndingAssignmentId(id)
    try {
      await api.delete(`/admin/patient-assignments/${id}`)
      setMessage({ key: 'success.assignmentEnded' })
      await load()
    } catch (requestError) {
      setError(apiErrorDescriptor(requestError, 'errors.endAssignment'))
    } finally {
      setEndingAssignmentId('')
    }
  }

  function handleTabKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    let nextIndex
    if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1
    } else {
      const isRtl = i18n.dir() === 'rtl'
      const forward = event.key === 'ArrowRight' ? !isRtl : isRtl
      nextIndex = (index + (forward ? 1 : -1) + TABS.length) % TABS.length
    }

    const nextTab = TABS[nextIndex]
    setTab(nextTab)
    document.getElementById(`admin-tab-${nextTab}`)?.focus()
  }

  function openAssignmentsTab() {
    setTab('assignments')
    requestAnimationFrame(() => {
      document.getElementById('admin-tab-assignments')?.focus()
    })
  }

  const activeNotice = error || message
  const activeNoticeText = activeNotice
    ? t(activeNotice.key, activeNotice.values)
    : ''

  return (
    <DashboardLayout
      role={t('common:roles.admin')}
      title={t('page.title')}
      subtitle={t('page.subtitle')}
    >
      <nav
        className="dashboard-tabs dashboard-tabs--admin"
        aria-label={t('tabs.label')}
        role="tablist"
      >
        {TABS.map((item, index) => (
          <button
            key={item}
            id={`admin-tab-${item}`}
            className={tab === item ? 'active' : ''}
            type="button"
            role="tab"
            aria-controls={`admin-panel-${item}`}
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            onClick={() => setTab(item)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {t(`tabs.${item}`)}
          </button>
        ))}
      </nav>

      <Notice value={activeNoticeText} error={Boolean(error)} />

      <div className="dashboard-content" aria-busy={loading}>
        {loading && hasLoaded && (
          <span className="sr-only" role="status">
            {t('loading.refreshing')}
          </span>
        )}
        {loading && !hasLoaded && (
          <section
            id={`admin-panel-${tab}`}
            className="panel loading-state"
            role="tabpanel"
            aria-labelledby={`admin-tab-${tab}`}
            aria-live="polite"
          >
            <span
              className="loading-state__spinner"
              aria-hidden="true"
            />
            <span className="loading-state__copy">
              <strong>{t('loading.title')}</strong>
              <small>{t('loading.description')}</small>
            </span>
          </section>
        )}

        {hasLoaded && tab === 'overview' && (
          <div
            id="admin-panel-overview"
            className="dashboard-tab-panel"
            role="tabpanel"
            aria-labelledby="admin-tab-overview"
          >
            <section
              className="stat-grid"
              aria-label={t('overview.stats.label')}
            >
              <article className="stat-card">
                <span className="stat-card__label">
                  {t('overview.stats.patients.title')}
                </span>
                <strong className="stat-card__value">
                  {numberFormatter.format(Number(stats.totalPatients || 0))}
                </strong>
                <small className="stat-card__meta">
                  {t('overview.stats.patients.description')}
                </small>
              </article>
              <article className="stat-card">
                <span className="stat-card__label">
                  {t('overview.stats.physiotherapists.title')}
                </span>
                <strong className="stat-card__value">
                  {numberFormatter.format(
                    Number(stats.totalPhysiotherapists || 0),
                  )}
                </strong>
                <small className="stat-card__meta">
                  {t('overview.stats.physiotherapists.description')}
                </small>
              </article>
              <article className="stat-card">
                <span className="stat-card__label">
                  {t('overview.stats.appointments.title')}
                </span>
                <strong className="stat-card__value">
                  {numberFormatter.format(Number(stats.totalAppointments || 0))}
                </strong>
                <small className="stat-card__meta">
                  {t('overview.stats.appointments.description')}
                </small>
              </article>
              <article className="stat-card stat--amber">
                <span className="stat-card__label">
                  {t('overview.stats.pending.title')}
                </span>
                <strong className="stat-card__value">
                  {numberFormatter.format(
                    Number(stats.pendingAppointments || 0),
                  )}
                </strong>
                <small className="stat-card__meta">
                  {t('overview.stats.pending.description')}
                </small>
              </article>
            </section>

            <section className="panel" aria-labelledby="overview-assignments">
              <div className="panel-heading">
                <div>
                  <h2 id="overview-assignments">
                    {t('overview.assignments.title')}
                  </h2>
                  <p>{t('overview.assignments.description')}</p>
                </div>
                <button
                  className="button"
                  type="button"
                  onClick={openAssignmentsTab}
                >
                  {t('overview.assignments.manage')}
                </button>
              </div>
              <AssignmentTable
                rows={assignments}
                onEnd={endAssignment}
                endingAssignmentId={endingAssignmentId}
              />
            </section>
          </div>
        )}

        {hasLoaded && tab === 'patients' && (
          <section
            id="admin-panel-patients"
            className="panel dashboard-tab-panel"
            role="tabpanel"
            aria-labelledby="admin-tab-patients"
          >
            <div className="panel-heading">
              <div>
                <h2>{t('patients.title')}</h2>
                <p>{t('patients.description')}</p>
              </div>
              <label className="search-field" htmlFor="admin-patient-search">
                <span className="sr-only">{t('patients.search.label')}</span>
                <input
                  id="admin-patient-search"
                  className="search"
                  type="search"
                  value={search}
                  autoComplete="off"
                  placeholder={t('patients.search.placeholder')}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            {patients.length ? (
              <div className="table-wrap">
                <table className="patient-table">
                  <caption className="sr-only">
                    {t('patients.tableCaption')}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('patients.columns.patient')}</th>
                      <th scope="col">{t('patients.columns.gender')}</th>
                      <th scope="col">{t('patients.columns.contact')}</th>
                      <th scope="col">{t('patients.columns.record')}</th>
                      <th scope="col">{t('patients.columns.status')}</th>
                      <th scope="col">
                        <span className="sr-only">
                          {t('patients.columns.actions')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => {
                      const name = personName(t, patient)
                      const actionId = `patients:${patient.id}`
                      const isUpdating = updatingAccountId === actionId
                      return (
                        <tr key={patient.id}>
                          <td data-label={t('patients.columns.patient')}>
                            <strong>{name}</strong>
                            <small dir="ltr">{patient.email}</small>
                          </td>
                          <td data-label={t('patients.columns.gender')}>
                            {t(
                              `common:gender.${patient.gender || 'notSet'}`,
                            )}
                          </td>
                          <td
                            data-label={t('patients.columns.contact')}
                            dir={patient.phone ? 'ltr' : undefined}
                          >
                            {patient.phone || t('shared.notAvailable')}
                          </td>
                          <td
                            data-label={t('patients.columns.record')}
                            dir={patient.medical_record_number ? 'ltr' : undefined}
                          >
                            {patient.medical_record_number ||
                              t('shared.notAvailable')}
                          </td>
                          <td data-label={t('patients.columns.status')}>
                            <span
                              className={`badge ${
                                patient.is_active ? 'badge--green' : ''
                              }`}
                            >
                              {t(
                                `common:statuses.${
                                  patient.is_active ? 'active' : 'disabled'
                                }`,
                              )}
                            </span>
                          </td>
                          <td
                            className="table-action-cell"
                            data-label={t('patients.columns.actions')}
                          >
                            <Link className="text-button" to={`/medical-records/patient/${patient.id}`}>Dossier / الملف</Link>
                            <button
                              className="text-button"
                              type="button"
                              disabled={isUpdating}
                              aria-label={t(
                                patient.is_active
                                  ? 'patients.actions.disableAccount'
                                  : 'patients.actions.enableAccount',
                                { name },
                              )}
                              onClick={() =>
                                toggleAccount(patient, 'patients')
                              }
                            >
                              {isUpdating
                                ? t('actions.updating')
                                : t(
                                    `common:actions.${
                                      patient.is_active ? 'disable' : 'enable'
                                    }`,
                                  )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t(
                  search.trim()
                    ? 'patients.empty.searchTitle'
                    : 'patients.empty.title',
                )}
                description={t(
                  search.trim()
                    ? 'patients.empty.searchDescription'
                    : 'patients.empty.description',
                )}
              />
            )}
          </section>
        )}

        {hasLoaded && tab === 'physiotherapists' && (
          <div
            id="admin-panel-physiotherapists"
            className="split-grid dashboard-tab-panel"
            role="tabpanel"
            aria-labelledby="admin-tab-physiotherapists"
          >
            <section className="panel" aria-labelledby="care-team-title">
              <div className="panel-heading">
                <div>
                  <h2 id="care-team-title">{t('clinicians.title')}</h2>
                  <p>
                    {t('clinicians.accountCount', {
                      count: clinicians.length,
                      formattedCount: numberFormatter.format(
                        clinicians.length,
                      ),
                    })}
                  </p>
                </div>
              </div>

              {clinicians.length ? (
                <div className="person-list" role="list">
                  {clinicians.map((clinician) => {
                    const profile = clinician.profiles || {}
                    const name = personName(t, profile)
                    const actionId = `physiotherapists:${clinician.profile_id}`
                    const isUpdatingAccount = updatingAccountId === actionId
                    const isUpdatingGender =
                      updatingGenderId === clinician.profile_id
                    return (
                      <article
                        className="person-row"
                        key={clinician.id}
                        role="listitem"
                      >
                        <div
                          className="avatar avatar--large"
                          aria-hidden="true"
                        >
                          {initials(profile)}
                        </div>
                        <div className="person-row__identity">
                          <strong>{name}</strong>
                          <span className="person-row__summary">
                            {t('clinicians.professionalSummary', {
                              title: clinician.professional_title,
                              specialization: clinician.specialization,
                            })}
                          </span>
                          <small className="person-row__meta">
                            {t('clinicians.licenseAndGender', {
                              license:
                                clinician.license_number ||
                                t('shared.notAvailable'),
                              gender: t(
                                `common:gender.${
                                  clinicianGender(clinician) || 'notSet'
                                }`,
                              ),
                            })}
                          </small>
                        </div>
                        <select
                          className="compact-select gender-select"
                          aria-label={t('clinicians.actions.setGender', {
                            name,
                          })}
                          value={clinicianGender(clinician)}
                          disabled={isUpdatingGender}
                          onChange={(event) =>
                            updateClinicianGender(
                              clinician,
                              event.target.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            {t('common:gender.set')}
                          </option>
                          <option value="female">
                            {t('common:gender.female')}
                          </option>
                          <option value="male">
                            {t('common:gender.male')}
                          </option>
                        </select>
                        <button
                          className="text-button person-row__action"
                          type="button"
                          disabled={isUpdatingAccount}
                          aria-label={t(
                            profile.is_active
                              ? 'clinicians.actions.disableAccount'
                              : 'clinicians.actions.enableAccount',
                            { name },
                          )}
                          onClick={() =>
                            toggleAccount(clinician, 'physiotherapists')
                          }
                        >
                          {isUpdatingAccount
                            ? t('actions.updating')
                            : t(
                                `common:actions.${
                                  profile.is_active ? 'disable' : 'enable'
                                }`,
                              )}
                        </button>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  title={t('clinicians.empty.title')}
                  description={t('clinicians.empty.description')}
                />
              )}
            </section>

            <form
              className="panel form-grid clinician-form"
              aria-labelledby="add-clinician-title"
              aria-busy={creatingClinician}
              onSubmit={createClinician}
            >
              <div className="panel-heading full">
                <div>
                  <h2 id="add-clinician-title">{t('form.title')}</h2>
                  <p>{t('form.description')}</p>
                </div>
              </div>

              {CLINICIAN_FIELDS.map((field) =>
                field.kind === 'gender' ? (
                  <label className="form-field" key={field.name}>
                    <span>{t('common:gender.label')}</span>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={updateForm}
                      required
                    >
                      <option value="" disabled>
                        {t('common:gender.select')}
                      </option>
                      <option value="female">
                        {t('common:gender.female')}
                      </option>
                      <option value="male">
                        {t('common:gender.male')}
                      </option>
                    </select>
                  </label>
                ) : (
                  <label className="form-field" key={field.name}>
                    <span>{t(field.labelKey)}</span>
                    <input
                      name={field.name}
                      type={field.type || 'text'}
                      value={form[field.name]}
                      inputMode={field.inputMode}
                      dir={field.direction}
                      autoComplete={field.autoComplete}
                      placeholder={t(field.placeholderKey)}
                      required={field.required !== false}
                      onChange={updateForm}
                    />
                  </label>
                ),
              )}

              <label className="form-field full">
                <span>{t('common:fields.biography')}</span>
                <textarea
                  name="biography"
                  value={form.biography}
                  placeholder={t('form.placeholders.biography')}
                  onChange={updateForm}
                />
              </label>
              <label className="check form-field--checkbox full">
                <input
                  type="checkbox"
                  name="is_accepting_patients"
                  checked={form.is_accepting_patients}
                  onChange={updateForm}
                />
                <span>{t('form.acceptingPatients')}</span>
              </label>
              <button
                className="button full"
                type="submit"
                disabled={creatingClinician}
              >
                {creatingClinician
                  ? t('actions.creatingClinician')
                  : t('form.submit')}
              </button>
            </form>
          </div>
        )}

        {hasLoaded && tab === 'assignments' && (
          <div
            id="admin-panel-assignments"
            className="split-grid dashboard-tab-panel"
            role="tabpanel"
            aria-labelledby="admin-tab-assignments"
          >
            <section className="panel" aria-labelledby="assignments-title">
              <div className="panel-heading">
                <div>
                  <h2 id="assignments-title">
                    {t('assignments.activeTitle')}
                  </h2>
                  <p>{t('assignments.activeDescription')}</p>
                </div>
              </div>
              <AssignmentTable
                rows={assignments}
                onEnd={endAssignment}
                endingAssignmentId={endingAssignmentId}
              />
            </section>

            <form
              className="panel stack assignment-form"
              aria-labelledby="assign-patient-title"
              aria-busy={assigningPatient}
              onSubmit={assignPatient}
            >
              <h2 id="assign-patient-title">
                {t('assignments.form.title')}
              </h2>
              <label htmlFor="assignment-patient">
                <span>{t('assignments.form.patient')}</span>
                <select
                  id="assignment-patient"
                  value={assignment.patient_id}
                  onChange={(event) =>
                    setAssignment({
                      ...assignment,
                      patient_id: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">{t('assignments.form.selectPatient')}</option>
                  {patients
                    .filter((patient) => patient.is_active)
                    .map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {personName(t, patient)}
                      </option>
                    ))}
                </select>
              </label>
              <label htmlFor="assignment-physiotherapist">
                <span>{t('assignments.form.physiotherapist')}</span>
                <select
                  id="assignment-physiotherapist"
                  value={assignment.physiotherapist_id}
                  onChange={(event) =>
                    setAssignment({
                      ...assignment,
                      physiotherapist_id: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    {t('assignments.form.selectClinician')}
                  </option>
                  {clinicians
                    .filter((clinician) => clinician.profiles?.is_active)
                    .map((clinician) => (
                      <option
                        key={clinician.profile_id}
                        value={clinician.profile_id}
                      >
                        {personName(t, clinician.profiles)}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="button"
                type="submit"
                disabled={assigningPatient}
              >
                {assigningPatient
                  ? t('actions.creatingAssignment')
                  : t('assignments.form.submit')}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function AssignmentTable({ rows, onEnd, endingAssignmentId }) {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const locale = localeFor(i18n.resolvedLanguage)
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  )

  if (!rows.length) {
    return (
      <EmptyState
        title={t('assignments.empty.title')}
        description={t('assignments.empty.description')}
      />
    )
  }

  return (
    <div className="table-wrap">
      <table className="assignment-table">
        <caption className="sr-only">
          {t('assignments.tableCaption')}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t('assignments.columns.patient')}</th>
            <th scope="col">{t('assignments.columns.physiotherapist')}</th>
            <th scope="col">{t('assignments.columns.assigned')}</th>
            <th scope="col">
              <span className="sr-only">
                {t('assignments.columns.actions')}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assignment) => {
            const patientName = personName(t, assignment.patient)
            const assignedAt = new Date(assignment.assigned_at)
            const formattedDate = Number.isNaN(assignedAt.getTime())
              ? t('shared.notAvailable')
              : dateFormatter.format(assignedAt)
            return (
              <tr key={assignment.id}>
                <td data-label={t('assignments.columns.patient')}>
                  <strong>{patientName}</strong>
                  <small dir="ltr">{assignment.patient.email}</small>
                </td>
                <td data-label={t('assignments.columns.physiotherapist')}>
                  {personName(t, assignment.physiotherapist)}
                </td>
                <td data-label={t('assignments.columns.assigned')}>
                  {formattedDate}
                </td>
                <td
                  className="table-action-cell"
                  data-label={t('assignments.columns.actions')}
                >
                  <button
                    className="text-button text-button--danger"
                    type="button"
                    disabled={endingAssignmentId === assignment.id}
                    aria-label={t('assignments.actions.end', {
                      name: patientName,
                    })}
                    onClick={() => onEnd(assignment.id)}
                  >
                    {endingAssignmentId === assignment.id
                      ? t('actions.endingAssignment')
                      : t('common:actions.end')}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="empty empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">
        +
      </span>
      <span className="empty-state__copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </div>
  )
}
