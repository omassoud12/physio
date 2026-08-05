import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'
import './PhysiotherapistDashboard.css'

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const dashboardTabs = ['schedule', 'appointments', 'patients', 'availability', 'profile']
const blankHours = { day_of_week: 'monday', start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 }
const blankTimeOff = { start_datetime: '', end_datetime: '', reason: '' }

const profileFields = [
  { key: 'first_name', group: 'profiles', labelKey: 'fields.firstName', autoComplete: 'given-name' },
  { key: 'last_name', group: 'profiles', labelKey: 'fields.lastName', autoComplete: 'family-name' },
  { key: 'phone', group: 'profiles', labelKey: 'fields.phone', autoComplete: 'tel', inputMode: 'tel' },
  { key: 'professional_title', labelKey: 'fields.professionalTitle' },
  { key: 'specialization', labelKey: 'fields.specialization' },
  { key: 'years_of_experience', labelKey: 'fields.yearsOfExperience', type: 'number', inputMode: 'numeric' },
  { key: 'consultation_duration', labelKey: 'fields.consultationDuration', type: 'number', inputMode: 'numeric' },
  { key: 'profile_image', labelKey: 'fields.profileImage', inputMode: 'url' },
]

function timeValue(value = '') {
  return value.slice(0, 5)
}

function validateHours(period, existingPeriods, ignoredId) {
  const start = timeValue(period.start_time)
  const end = timeValue(period.end_time)
  const duration = Number(period.slot_duration_minutes)

  if (!start || !end || start >= end) return { key: 'errors.hoursOrder' }
  if (!Number.isFinite(duration) || duration < 5) return { key: 'errors.minimumSlotDuration', params: { count: 5 } }

  const overlaps = period.is_active !== false && existingPeriods.some((item) => (
    item.id !== ignoredId
    && item.day_of_week === period.day_of_week
    && item.is_active !== false
    && start < timeValue(item.end_time)
    && end > timeValue(item.start_time)
  ))

  if (overlaps) return { key: 'errors.overlappingHours', params: { day: period.day_of_week } }
  return null
}

function asUtcIso(value) {
  return new Date(`${value}:00Z`).toISOString()
}

function localeFor(language) {
  return language?.startsWith('ar') ? 'ar-LB-u-ca-gregory' : 'en-US'
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(value)
}

function formatUtcDateTime(value, locale, t) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('time.invalidDate')

  return t('time.utcDateTime', {
    value: date.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }),
  })
}

function formatUtcDatePart(value, locale, options) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, { ...options, timeZone: 'UTC' })
}

function requestErrorNotice(requestError, fallbackKey) {
  if (!requestError?.response) return { key: 'errors.network', namespace: 'common', type: 'error' }
  if (requestError.response.status === 401) return { key: 'errors.session', namespace: 'common', type: 'error' }
  return { key: fallbackKey, type: 'error' }
}

function translatedNotice(notice, t, locale) {
  if (!notice) return ''

  const params = { ...notice.params }
  if (params.day) params.day = t(`weekdays.${params.day}`, { ns: 'common' })
  if (params.count !== undefined) params.formattedCount = formatNumber(params.count, locale)

  return t(notice.key, {
    ns: notice.namespace || 'physiotherapist',
    ...params,
  })
}

function patientName(patient) {
  return [patient?.first_name, patient?.last_name].filter(Boolean).join(' ')
}

function patientInitials(patient) {
  return `${patient?.first_name?.[0] || ''}${patient?.last_name?.[0] || ''}`.toLocaleUpperCase()
}

export default function PhysiotherapistDashboard() {
  const { t, i18n } = useTranslation(['physiotherapist', 'common'])
  const locale = localeFor(i18n.resolvedLanguage)
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [hours, setHours] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [newHours, setNewHours] = useState(blankHours)
  const [newTimeOff, setNewTimeOff] = useState(blankTimeOff)
  const [tab, setTab] = useState('schedule')
  const [notice, setNotice] = useState(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [addingHours, setAddingHours] = useState(false)
  const [savingHoursId, setSavingHoursId] = useState('')
  const [removingHoursId, setRemovingHoursId] = useState('')
  const [addingTimeOff, setAddingTimeOff] = useState(false)
  const [removingTimeOffId, setRemovingTimeOffId] = useState('')
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState('')

  const load = useCallback(async ({ initial = false } = {}) => {
    if (initial) {
      setIsInitialLoading(true)
      setLoadFailed(false)
      setNotice(null)
    }

    try {
      const [me, visits, patientList, availability, exceptions] = await Promise.all([
        api.get('/physiotherapist/me'),
        api.get('/physiotherapist/appointments'),
        api.get('/physiotherapist/patients'),
        api.get('/physiotherapist/availability'),
        api.get('/physiotherapist/time-off'),
      ])
      setProfile(me.data.data)
      setAppointments(visits.data.data || [])
      setPatients(patientList.data.data || [])
      setHours(availability.data.data || [])
      setTimeOff(exceptions.data.data || [])
      setLoadFailed(false)
      return true
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.loadDashboard'))
      if (initial) setLoadFailed(true)
      return false
    } finally {
      if (initial) setIsInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    void load({ initial: true })
  }, [load])

  async function saveProfile(event) {
    event.preventDefault()
    if (!profile || savingProfile) return

    setNotice(null)
    setSavingProfile(true)
    try {
      await api.patch('/physiotherapist/me', {
        first_name: profile.profiles.first_name,
        last_name: profile.profiles.last_name,
        phone: profile.profiles.phone,
        professional_title: profile.professional_title,
        specialization: profile.specialization,
        biography: profile.biography,
        years_of_experience: profile.years_of_experience,
        consultation_duration: profile.consultation_duration,
        profile_image: profile.profile_image,
        is_accepting_patients: profile.is_accepting_patients,
      })
      setNotice({ key: 'notices.profileUpdated', type: 'success' })
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.updateProfile'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function addHours(event) {
    event.preventDefault()
    if (addingHours) return

    setNotice(null)
    const validationError = validateHours(newHours, hours)
    if (validationError) {
      setNotice({ ...validationError, type: 'error' })
      return
    }

    setAddingHours(true)
    try {
      await api.post('/physiotherapist/availability', newHours)
      setNotice({ key: 'notices.availabilityAdded', type: 'success' })
      setNewHours({ ...blankHours, slot_duration_minutes: profile?.consultation_duration || 30 })
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.addAvailability'))
    } finally {
      setAddingHours(false)
    }
  }

  function changeHours(id, field, value) {
    setHours((current) => current.map((period) => (
      period.id === id ? { ...period, [field]: value } : period
    )))
  }

  async function saveHours(id) {
    if (savingHoursId || removingHoursId) return

    const period = hours.find((item) => item.id === id)
    if (!period) return

    const validationError = validateHours(period, hours, id)
    setNotice(null)
    if (validationError) {
      setNotice({ ...validationError, type: 'error' })
      return
    }

    setSavingHoursId(id)
    try {
      await api.patch(`/physiotherapist/availability/${id}`, {
        day_of_week: period.day_of_week,
        start_time: timeValue(period.start_time),
        end_time: timeValue(period.end_time),
        slot_duration_minutes: Number(period.slot_duration_minutes),
        is_active: period.is_active,
      })
      setNotice({ key: 'notices.availabilityUpdated', type: 'success' })
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.updateAvailability'))
    } finally {
      setSavingHoursId('')
    }
  }

  async function toggleHours(id, isActive) {
    if (savingHoursId || removingHoursId) return

    setNotice(null)
    setSavingHoursId(id)
    try {
      await api.patch(`/physiotherapist/availability/${id}`, { is_active: isActive })
      setHours((current) => current.map((period) => (
        period.id === id ? { ...period, is_active: isActive } : period
      )))
      setNotice({
        key: isActive ? 'notices.workingPeriodEnabled' : 'notices.workingPeriodPaused',
        type: 'success',
      })
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.updateAvailability'))
    } finally {
      setSavingHoursId('')
    }
  }

  async function removeHours(id) {
    if (savingHoursId || removingHoursId) return

    setNotice(null)
    setRemovingHoursId(id)
    try {
      await api.delete(`/physiotherapist/availability/${id}`)
      setNotice({ key: 'notices.availabilityRemoved', type: 'success' })
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.removeAvailability'))
    } finally {
      setRemovingHoursId('')
    }
  }

  async function addTimeOff(event) {
    event.preventDefault()
    if (addingTimeOff) return

    setNotice(null)
    if (!newTimeOff.start_datetime || !newTimeOff.end_datetime || newTimeOff.start_datetime >= newTimeOff.end_datetime) {
      setNotice({ key: 'errors.timeOffOrder', type: 'error' })
      return
    }

    setAddingTimeOff(true)
    try {
      await api.post('/physiotherapist/time-off', {
        start_datetime: asUtcIso(newTimeOff.start_datetime),
        end_datetime: asUtcIso(newTimeOff.end_datetime),
        reason: newTimeOff.reason.trim(),
      })
      setNotice({ key: 'notices.timeOffAdded', type: 'success' })
      setNewTimeOff(blankTimeOff)
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.addTimeOff'))
    } finally {
      setAddingTimeOff(false)
    }
  }

  async function removeTimeOff(id) {
    if (removingTimeOffId) return

    setNotice(null)
    setRemovingTimeOffId(id)
    try {
      await api.delete(`/physiotherapist/time-off/${id}`)
      setNotice({ key: 'notices.timeOffRemoved', type: 'success' })
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.removeTimeOff'))
    } finally {
      setRemovingTimeOffId('')
    }
  }

  async function updateAppointmentStatus(id, value) {
    if (updatingAppointmentId) return

    setNotice(null)
    setUpdatingAppointmentId(id)
    try {
      await api.patch(`/physiotherapist/appointments/${id}/status`, { status: value })
      setNotice({ key: 'notices.appointmentUpdated', type: 'success' })
      await load()
    } catch (requestError) {
      setNotice(requestErrorNotice(requestError, 'errors.updateAppointment'))
    } finally {
      setUpdatingAppointmentId('')
    }
  }

  function handleTabKeyDown(event, currentTab) {
    const currentIndex = dashboardTabs.indexOf(currentTab)
    const direction = i18n.dir()
    let nextIndex

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = dashboardTabs.length - 1
    if (event.key === 'ArrowRight') nextIndex = currentIndex + (direction === 'rtl' ? -1 : 1)
    if (event.key === 'ArrowLeft') nextIndex = currentIndex + (direction === 'rtl' ? 1 : -1)
    if (nextIndex === undefined) return

    event.preventDefault()
    const wrappedIndex = (nextIndex + dashboardTabs.length) % dashboardTabs.length
    const nextTab = dashboardTabs[wrappedIndex]
    setTab(nextTab)
    document.getElementById(`physiotherapist-tab-${nextTab}`)?.focus()
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayVisits = appointments.filter((appointment) => appointment.starts_at.slice(0, 10) === today)
  const upcoming = appointments.filter((appointment) => (
    new Date(appointment.starts_at) >= new Date()
    && ['pending', 'confirmed'].includes(appointment.status)
  ))
  const sortedHours = [...hours].sort((left, right) => (
    weekDays.indexOf(left.day_of_week) - weekDays.indexOf(right.day_of_week)
    || timeValue(left.start_time).localeCompare(timeValue(right.start_time))
  ))

  return (
    <DashboardLayout
      role={t('layout.role')}
      title={t('layout.title')}
      subtitle={t('layout.subtitle')}
    >
      <div className="physiotherapist-dashboard">
        <nav className="physiotherapist-tabs-nav" aria-label={t('tabs.label')}>
          <div className="dashboard-tabs" role="tablist">
            {dashboardTabs.map((item) => (
              <button
                id={`physiotherapist-tab-${item}`}
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                aria-controls={`physiotherapist-panel-${item}`}
                tabIndex={tab === item ? 0 : -1}
                className={tab === item ? 'active' : ''}
                onClick={() => setTab(item)}
                onKeyDown={(event) => handleTabKeyDown(event, item)}
              >
                {t(`tabs.${item}`)}
              </button>
            ))}
          </div>
        </nav>

        <Notice
          value={translatedNotice(notice, t, locale)}
          error={notice?.type === 'error'}
        />

        <div
          id={`physiotherapist-panel-${tab}`}
          className="physiotherapist-tabpanel"
          role="tabpanel"
          aria-labelledby={`physiotherapist-tab-${tab}`}
          tabIndex="0"
        >
          {isInitialLoading ? (
            <DashboardLoading />
          ) : loadFailed ? (
            <LoadFailure onRetry={() => load({ initial: true })} />
          ) : (
            <>
              {tab === 'schedule' && (
                <>
                  <section className="stat-grid stat-grid--three physiotherapist-stat-grid" aria-labelledby="schedule-overview-heading">
                    <h2 className="physiotherapist-sr-only" id="schedule-overview-heading">{t('stats.overviewTitle')}</h2>
                    <article>
                      <span>{t('stats.today')}</span>
                      <strong>{formatNumber(todayVisits.length, locale)}</strong>
                      <small>{t('stats.appointments', { count: todayVisits.length })}</small>
                    </article>
                    <article>
                      <span>{t('stats.upcoming')}</span>
                      <strong>{formatNumber(upcoming.length, locale)}</strong>
                      <small>{t('stats.activeBookings', { count: upcoming.length })}</small>
                    </article>
                    <article>
                      <span>{t('stats.patients')}</span>
                      <strong>{formatNumber(patients.length, locale)}</strong>
                      <small>{t('stats.authorizedRecords', { count: patients.length })}</small>
                    </article>
                  </section>
                  <AppointmentPanel
                    rows={todayVisits.length ? todayVisits : upcoming.slice(0, 5)}
                    onStatus={updateAppointmentStatus}
                    titleKey={todayVisits.length ? 'appointments.todayTitle' : 'appointments.nextTitle'}
                    panelId="schedule-appointments-heading"
                    updatingAppointmentId={updatingAppointmentId}
                  />
                </>
              )}

              {tab === 'appointments' && (
                <AppointmentPanel
                  rows={appointments}
                  onStatus={updateAppointmentStatus}
                  titleKey="appointments.allTitle"
                  panelId="all-appointments-heading"
                  updatingAppointmentId={updatingAppointmentId}
                />
              )}

              {tab === 'patients' && (
                <PatientsPanel patients={patients} />
              )}

              {tab === 'availability' && (
                <AvailabilityTab
                  hours={sortedHours}
                  newHours={newHours}
                  setNewHours={setNewHours}
                  onAddHours={addHours}
                  addingHours={addingHours}
                  onChangeHours={changeHours}
                  onSaveHours={saveHours}
                  onToggleHours={toggleHours}
                  onRemoveHours={removeHours}
                  savingHoursId={savingHoursId}
                  removingHoursId={removingHoursId}
                  timeOff={timeOff}
                  newTimeOff={newTimeOff}
                  setNewTimeOff={setNewTimeOff}
                  onAddTimeOff={addTimeOff}
                  addingTimeOff={addingTimeOff}
                  onRemoveTimeOff={removeTimeOff}
                  removingTimeOffId={removingTimeOffId}
                />
              )}

              {tab === 'profile' && (
                profile ? (
                  <ProfilePanel
                    profile={profile}
                    setProfile={setProfile}
                    onSubmit={saveProfile}
                    isSaving={savingProfile}
                  />
                ) : (
                  <section className="panel physiotherapist-empty-panel" aria-labelledby="profile-unavailable-heading">
                    <h2 id="profile-unavailable-heading">{t('profile.unavailableTitle')}</h2>
                    <p>{t('profile.unavailableDescription')}</p>
                  </section>
                )
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function DashboardLoading() {
  const { t } = useTranslation('physiotherapist')

  return (
    <section className="panel physiotherapist-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="physiotherapist-spinner" aria-hidden="true" />
      <div>
        <h2>{t('loading.title')}</h2>
        <p>{t('loading.description')}</p>
      </div>
      <div className="physiotherapist-loading__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}

function LoadFailure({ onRetry }) {
  const { t } = useTranslation(['physiotherapist', 'common'])

  return (
    <section className="panel physiotherapist-empty-panel" aria-labelledby="dashboard-load-failure-heading">
      <div className="physiotherapist-empty-panel__icon" aria-hidden="true">!</div>
      <h2 id="dashboard-load-failure-heading">{t('loading.failureTitle')}</h2>
      <p>{t('loading.failureDescription')}</p>
      <button className="button" type="button" onClick={onRetry}>
        {t('actions.retry', { ns: 'common' })}
      </button>
    </section>
  )
}

function PatientsPanel({ patients }) {
  const { t } = useTranslation('physiotherapist')

  return (
    <section className="panel" aria-labelledby="physiotherapist-patients-heading">
      <div className="panel-heading">
        <div>
          <h2 id="physiotherapist-patients-heading">{t('patients.title')}</h2>
          <p>{t('patients.description')}</p>
        </div>
      </div>
      {patients.length ? (
        <div className="person-grid physiotherapist-person-grid">
          {patients.map((patient) => {
            const name = patientName(patient) || t('patients.unnamedPatient')
            return (
              <article
                className="person-row physiotherapist-person-row"
                key={patient.id}
                aria-label={t('patients.patientLabel', { name })}
              >
                <div className="avatar avatar--large" aria-hidden="true">{patientInitials(patient)}</div>
                <div>
                  <strong>{name}</strong>
                  <span dir="auto">{patient.email}</span>
                  <small className="physiotherapist-patient-meta">
                    <span dir={patient.phone ? 'ltr' : undefined}>{patient.phone || t('patients.noPhone')}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {patient.medical_record_number
                        ? t('patients.record', { number: patient.medical_record_number })
                        : t('patients.recordNotSet')}
                    </span>
                  </small>
                </div>
                <Link className="text-button" to={`/medical-records/patient/${patient.id}`}>Dossier médical / الملف الطبي</Link>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty physiotherapist-empty-state">{t('patients.empty')}</div>
      )}
    </section>
  )
}

function ProfilePanel({ profile, setProfile, onSubmit, isSaving }) {
  const { t } = useTranslation(['physiotherapist', 'common'])

  function fieldValue(field) {
    return field.group ? profile[field.group]?.[field.key] || '' : profile[field.key] || ''
  }

  function updateField(field, value) {
    if (field.group) {
      setProfile({
        ...profile,
        [field.group]: {
          ...profile[field.group],
          [field.key]: value,
        },
      })
      return
    }
    setProfile({ ...profile, [field.key]: value })
  }

  return (
    <form className="panel form-grid physiotherapist-profile-form" onSubmit={onSubmit} aria-labelledby="professional-profile-heading">
      <div className="panel-heading full">
        <div>
          <h2 id="professional-profile-heading">{t('profile.title')}</h2>
          <p>{t('profile.description')}</p>
        </div>
      </div>

      {profileFields.map((field) => (
        <label key={field.key}>
          <span>{t(field.labelKey, { ns: 'common' })}</span>
          <input
            type={field.type || 'text'}
            inputMode={field.inputMode}
            autoComplete={field.autoComplete}
            value={fieldValue(field)}
            disabled={isSaving}
            onChange={(event) => updateField(field, event.target.value)}
          />
        </label>
      ))}

      <label className="full">
        <span>{t('fields.biography', { ns: 'common' })}</span>
        <textarea
          value={profile.biography || ''}
          disabled={isSaving}
          onChange={(event) => setProfile({ ...profile, biography: event.target.value })}
        />
      </label>

      <label className="check full physiotherapist-profile-form__check">
        <input
          type="checkbox"
          checked={Boolean(profile.is_accepting_patients)}
          disabled={isSaving}
          onChange={(event) => setProfile({ ...profile, is_accepting_patients: event.target.checked })}
        />
        <span>{t('profile.acceptingPatients')}</span>
      </label>

      <button className="button full" type="submit" disabled={isSaving} aria-busy={isSaving}>
        {isSaving ? t('profile.saving') : t('profile.save')}
      </button>
    </form>
  )
}

function AvailabilityTab({
  hours,
  newHours,
  setNewHours,
  onAddHours,
  addingHours,
  onChangeHours,
  onSaveHours,
  onToggleHours,
  onRemoveHours,
  savingHoursId,
  removingHoursId,
  timeOff,
  newTimeOff,
  setNewTimeOff,
  onAddTimeOff,
  addingTimeOff,
  onRemoveTimeOff,
  removingTimeOffId,
}) {
  const { t, i18n } = useTranslation(['physiotherapist', 'common'])
  const locale = localeFor(i18n.resolvedLanguage)
  const periodActionsLocked = Boolean(savingHoursId || removingHoursId)
  const timeOffActionsLocked = Boolean(removingTimeOffId)

  return (
    <div className="availability-workspace">
      <section className="panel availability-week" aria-labelledby="weekly-hours-heading">
        <div className="panel-heading">
          <div>
            <h2 id="weekly-hours-heading">{t('availability.weeklyTitle')}</h2>
            <p>{t('availability.weeklyDescription')}</p>
          </div>
          <span className="clinic-time-label">{t('availability.clinicTime')}</span>
        </div>

        <div className="availability-days">
          {weekDays.map((day) => {
            const periods = hours.filter((period) => period.day_of_week === day)
            const dayLabel = t(`weekdays.${day}`, { ns: 'common' })

            return (
              <section className="availability-day" key={day} aria-labelledby={`availability-${day}-heading`}>
                <div className="availability-day__heading">
                  <strong id={`availability-${day}-heading`}>{dayLabel}</strong>
                  <small>
                    {periods.length
                      ? t('availability.periodCount', {
                          count: periods.length,
                          formattedCount: formatNumber(periods.length, locale),
                        })
                      : t('statuses.unavailable', { ns: 'common' })}
                  </small>
                </div>

                <div className="availability-day__periods">
                  {periods.map((period) => {
                    const isSaving = savingHoursId === period.id
                    const isRemoving = removingHoursId === period.id
                    const isBusy = isSaving || isRemoving
                    const periodDayLabel = t(`weekdays.${period.day_of_week}`, { ns: 'common' })
                    const periodLabel = t('availability.periodLabel', {
                      day: periodDayLabel,
                      start: timeValue(period.start_time),
                      end: timeValue(period.end_time),
                    })

                    return (
                      <article
                        className={`availability-period ${period.is_active === false ? 'availability-period--paused' : ''}`}
                        key={period.id}
                        aria-label={periodLabel}
                        aria-busy={isBusy}
                      >
                        <label className="availability-toggle">
                          <input
                            type="checkbox"
                            checked={period.is_active !== false}
                            disabled={periodActionsLocked}
                            aria-label={t('availability.togglePeriodLabel', { period: periodLabel })}
                            onChange={(event) => onToggleHours(period.id, event.target.checked)}
                          />
                          <span>
                            {period.is_active === false
                              ? t('statuses.paused', { ns: 'common' })
                              : t('statuses.active', { ns: 'common' })}
                          </span>
                        </label>

                        <label className="availability-period__day">
                          <span>{t('fields.day', { ns: 'common' })}</span>
                          <select
                            value={period.day_of_week}
                            disabled={isBusy}
                            onChange={(event) => onChangeHours(period.id, 'day_of_week', event.target.value)}
                          >
                            {weekDays.map((option) => (
                              <option key={option} value={option}>
                                {t(`weekdays.${option}`, { ns: 'common' })}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="availability-period__start">
                          <span>{t('fields.starts', { ns: 'common' })}</span>
                          <input
                            type="time"
                            value={timeValue(period.start_time)}
                            disabled={isBusy}
                            onChange={(event) => onChangeHours(period.id, 'start_time', event.target.value)}
                            required
                          />
                        </label>

                        <label className="availability-period__end">
                          <span>{t('fields.ends', { ns: 'common' })}</span>
                          <input
                            type="time"
                            value={timeValue(period.end_time)}
                            disabled={isBusy}
                            onChange={(event) => onChangeHours(period.id, 'end_time', event.target.value)}
                            required
                          />
                        </label>

                        <label className="availability-period__duration">
                          <span>{t('availability.slotMinutes')}</span>
                          <input
                            type="number"
                            min="5"
                            step="5"
                            value={period.slot_duration_minutes}
                            disabled={isBusy}
                            onChange={(event) => onChangeHours(period.id, 'slot_duration_minutes', Number(event.target.value))}
                            required
                          />
                        </label>

                        <div className="availability-period__actions">
                          <button
                            className="text-button"
                            type="button"
                            disabled={periodActionsLocked}
                            aria-label={t('availability.savePeriodLabel', { period: periodLabel })}
                            onClick={() => onSaveHours(period.id)}
                          >
                            {isSaving ? t('availability.savingPeriod') : t('actions.save', { ns: 'common' })}
                          </button>
                          <button
                            className="text-button text-button--danger"
                            type="button"
                            disabled={periodActionsLocked}
                            aria-label={t('availability.removePeriodLabel', { period: periodLabel })}
                            onClick={() => onRemoveHours(period.id)}
                          >
                            {isRemoving ? t('availability.removingPeriod') : t('actions.remove', { ns: 'common' })}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <div className="availability-sidebar">
        <form className="panel stack availability-form" onSubmit={onAddHours} aria-labelledby="add-working-period-heading">
          <div>
            <h2 id="add-working-period-heading">{t('availability.addPeriodTitle')}</h2>
            <p>{t('availability.addPeriodDescription')}</p>
          </div>

          <label>
            <span>{t('fields.day', { ns: 'common' })}</span>
            <select
              value={newHours.day_of_week}
              disabled={addingHours}
              onChange={(event) => setNewHours({ ...newHours, day_of_week: event.target.value })}
            >
              {weekDays.map((day) => (
                <option key={day} value={day}>{t(`weekdays.${day}`, { ns: 'common' })}</option>
              ))}
            </select>
          </label>

          <div className="availability-form__times">
            <label>
              <span>{t('fields.starts', { ns: 'common' })}</span>
              <input
                type="time"
                value={newHours.start_time}
                disabled={addingHours}
                onChange={(event) => setNewHours({ ...newHours, start_time: event.target.value })}
                required
              />
            </label>
            <label>
              <span>{t('fields.ends', { ns: 'common' })}</span>
              <input
                type="time"
                value={newHours.end_time}
                disabled={addingHours}
                onChange={(event) => setNewHours({ ...newHours, end_time: event.target.value })}
                required
              />
            </label>
          </div>

          <label>
            <span>{t('availability.slotDuration')}</span>
            <input
              type="number"
              min="5"
              step="5"
              value={newHours.slot_duration_minutes}
              disabled={addingHours}
              onChange={(event) => setNewHours({ ...newHours, slot_duration_minutes: Number(event.target.value) })}
              required
            />
          </label>

          <button className="button" type="submit" disabled={addingHours} aria-busy={addingHours}>
            {addingHours ? t('availability.addingPeriod') : t('availability.addPeriod')}
          </button>
        </form>

        <form className="panel stack availability-form" onSubmit={onAddTimeOff} aria-labelledby="add-time-off-heading">
          <div>
            <h2 id="add-time-off-heading">{t('availability.addTimeOffTitle')}</h2>
            <p>{t('availability.addTimeOffDescription')}</p>
          </div>

          <label>
            <span>{t('fields.starts', { ns: 'common' })}</span>
            <input
              type="datetime-local"
              value={newTimeOff.start_datetime}
              disabled={addingTimeOff}
              onChange={(event) => setNewTimeOff({ ...newTimeOff, start_datetime: event.target.value })}
              required
            />
          </label>

          <label>
            <span>{t('fields.ends', { ns: 'common' })}</span>
            <input
              type="datetime-local"
              value={newTimeOff.end_datetime}
              disabled={addingTimeOff}
              onChange={(event) => setNewTimeOff({ ...newTimeOff, end_datetime: event.target.value })}
              required
            />
          </label>

          <label>
            <span>{t('availability.reasonOptional')}</span>
            <input
              value={newTimeOff.reason}
              maxLength="180"
              disabled={addingTimeOff}
              onChange={(event) => setNewTimeOff({ ...newTimeOff, reason: event.target.value })}
              placeholder={t('availability.reasonPlaceholder')}
            />
          </label>

          <button className="button" type="submit" disabled={addingTimeOff} aria-busy={addingTimeOff}>
            {addingTimeOff ? t('availability.blockingTime') : t('availability.blockTime')}
          </button>
        </form>
      </div>

      <section className="panel availability-exceptions" aria-labelledby="time-off-exceptions-heading">
        <div className="panel-heading">
          <div>
            <h2 id="time-off-exceptions-heading">{t('availability.exceptionsTitle')}</h2>
            <p>{t('availability.exceptionsDescription')}</p>
          </div>
        </div>

        <div className="availability-exception-list">
          {timeOff.map((item) => {
            const isRemoving = removingTimeOffId === item.id
            const reason = item.reason || t('availability.defaultReason')
            const dateRange = t('time.range', {
              start: formatUtcDateTime(item.start_datetime, locale, t),
              end: formatUtcDateTime(item.end_datetime, locale, t),
            })

            return (
              <article key={item.id} aria-busy={isRemoving}>
                <div>
                  <strong>{reason}</strong>
                  <span dir="auto">{dateRange}</span>
                </div>
                <button
                  className="text-button text-button--danger"
                  type="button"
                  disabled={timeOffActionsLocked}
                  aria-label={t('availability.removeExceptionLabel', { reason })}
                  onClick={() => onRemoveTimeOff(item.id)}
                >
                  {isRemoving ? t('availability.removingException') : t('actions.remove', { ns: 'common' })}
                </button>
              </article>
            )
          })}
          {!timeOff.length && <div className="empty physiotherapist-empty-state">{t('availability.emptyExceptions')}</div>}
        </div>
      </section>
    </div>
  )
}

function AppointmentPanel({ rows, onStatus, titleKey, panelId, updatingAppointmentId }) {
  const { t, i18n } = useTranslation(['physiotherapist', 'common'])
  const locale = localeFor(i18n.resolvedLanguage)

  return (
    <section className="panel" aria-labelledby={panelId}>
      <div className="panel-heading">
        <div>
          <h2 id={panelId}>{t(titleKey)}</h2>
          <p>{t('appointments.description')}</p>
        </div>
      </div>

      <div className="appointment-list physiotherapist-appointment-list">
        {rows.map((appointment) => {
          const name = patientName(appointment.profiles) || t('patients.unnamedPatient')
          const statusLabel = t(`statuses.${appointment.status}`, { ns: 'common' })
          const isUpdating = updatingAppointmentId === appointment.id

          return (
            <article className="physiotherapist-appointment" key={appointment.id} aria-busy={isUpdating}>
              <div className="date-tile" aria-hidden="true">
                <strong>{formatUtcDatePart(appointment.starts_at, locale, { day: 'numeric' })}</strong>
                <span>{formatUtcDatePart(appointment.starts_at, locale, { month: 'short' })}</span>
              </div>

              <div className="physiotherapist-appointment__details">
                <strong>{name}</strong>
                <span>{appointment.treatment_type || t('appointments.unspecifiedTreatment')}</span>
                <small>{formatUtcDateTime(appointment.starts_at, locale, t)}</small>
              </div>

              <span
                className={`badge physiotherapist-status physiotherapist-status--${appointment.status}`}
                aria-label={t('appointments.statusLabel', { status: statusLabel })}
              >
                {statusLabel}
              </span>

              <div className="action-row physiotherapist-appointment__actions">
                {isUpdating ? (
                  <span className="physiotherapist-inline-progress" role="status">
                    <span className="physiotherapist-spinner physiotherapist-spinner--small" aria-hidden="true" />
                    {t('appointments.updating')}
                  </span>
                ) : (
                  <>
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          className="text-button"
                          type="button"
                          disabled={Boolean(updatingAppointmentId)}
                          aria-label={t('appointments.confirmLabel', { name })}
                          onClick={() => onStatus(appointment.id, 'confirmed')}
                        >
                          {t('actions.confirm', { ns: 'common' })}
                        </button>
                        <button
                          className="text-button text-button--danger"
                          type="button"
                          disabled={Boolean(updatingAppointmentId)}
                          aria-label={t('appointments.rejectLabel', { name })}
                          onClick={() => onStatus(appointment.id, 'rejected')}
                        >
                          {t('actions.reject', { ns: 'common' })}
                        </button>
                      </>
                    )}
                    {appointment.status === 'confirmed' && (
                      <>
                        <button
                          className="text-button"
                          type="button"
                          disabled={Boolean(updatingAppointmentId)}
                          aria-label={t('appointments.completeLabel', { name })}
                          onClick={() => onStatus(appointment.id, 'completed')}
                        >
                          {t('actions.complete', { ns: 'common' })}
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          disabled={Boolean(updatingAppointmentId)}
                          aria-label={t('appointments.noShowLabel', { name })}
                          onClick={() => onStatus(appointment.id, 'no_show')}
                        >
                          {t('actions.noShow', { ns: 'common' })}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          )
        })}
        {!rows.length && <div className="empty physiotherapist-empty-state">{t('appointments.empty')}</div>}
      </div>
    </section>
  )
}
