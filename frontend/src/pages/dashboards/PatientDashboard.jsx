import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import {
  formatNumber,
  formatUtcDate,
  formatUtcDateKey,
} from '../../i18n/formatters.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'
import BookingInstructions from '../../components/BookingInstructions.jsx'
import './PatientDashboard.css'

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const blankBooking = { treatment_type: '', notes: '' }
const supportedGenders = new Set(['female', 'male'])

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateKey(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

function monthRange(month) {
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return {
    from: dateKey(year, monthIndex, 1),
    to: dateKey(year, monthIndex, lastDay),
  }
}

function monthWeeks(month) {
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()
  const leadingDays = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const cells = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: lastDay }, (_, index) =>
      dateKey(year, monthIndex, index + 1),
    ),
  ]

  while (cells.length % 7) cells.push(null)

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  )
}

function formatMonth(month, language) {
  return formatUtcDate(month, language, {
    month: 'long',
    year: 'numeric',
  })
}

function formatDate(date, language) {
  return formatUtcDateKey(date, language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDate(date, language) {
  return formatUtcDateKey(date, language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value, language) {
  return formatUtcDate(value, language, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateTime(value, language) {
  return formatUtcDate(value, language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function personName(person) {
  const profile = person?.profiles || person
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
}

function hasGender(profile) {
  return supportedGenders.has(profile?.gender)
}

function CalendarArrow({ next = false }) {
  return (
    <svg
      className={`patient-calendar__arrow patient-calendar__arrow--${
        next ? 'next' : 'previous'
      }`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m14.5 6-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function PatientDashboard() {
  const { t, i18n } = useTranslation(['patient', 'common'])
  const language = i18n.resolvedLanguage || 'en'
  const currentMonth = useMemo(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }, [])
  const today = new Date().toISOString().slice(0, 10)
  const bookingPanelRef = useRef(null)
  const doctorSelectRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [genderDraft, setGenderDraft] = useState('')
  const [clinicians, setClinicians] = useState([])
  const [appointments, setAppointments] = useState([])
  const [month, setMonth] = useState(currentMonth)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [days, setDays] = useState({})
  const [timeZone, setTimeZone] = useState('UTC')
  const [booking, setBooking] = useState(blankBooking)
  const [initialLoading, setInitialLoading] = useState(true)
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(false)
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0)
  const [savingGender, setSavingGender] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [notice, setNotice] = useState(null)
  const [medicalProfileComplete, setMedicalProfileComplete] = useState(null)
  const [unavailableHint, setUnavailableHint] = useState('')

  const range = monthRange(month)
  const weeks = monthWeeks(month)
  const recordedGender = hasGender(profile)
  const selectedClinician = clinicians.find(
    (clinician) => clinician.profile_id === selectedDoctorId,
  )
  const selectedDateSlots = selectedDate ? days[selectedDate] || [] : []
  const selectedSlotDetails = selectedDateSlots.find(
    (slot) => slot.starts_at === selectedSlot,
  )

  function number(value) {
    return formatNumber(value, language, { useGrouping: false })
  }

  function pluralValues(count) {
    return { count, value: number(count) }
  }

  async function refreshAppointments() {
    const response = await api.get('/appointments/my')
    setAppointments(response.data.data || [])
  }

  async function refreshClinicians() {
    setDirectoryLoading(true)
    try {
      const response = await api.get('/physiotherapists')
      setClinicians(response.data.data || [])
    } finally {
      setDirectoryLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setInitialLoading(true)
      setNotice(null)
      try {
        const [profileResponse, appointmentResponse, medicalResponse] = await Promise.all([
          api.get('/profile/me'),
          api.get('/appointments/my'),
          api.get('/medical-records/me').catch(() => ({ data: { data: { record: null } } })),
        ])
        if (!active) return

        const loadedProfile = profileResponse.data.data
        setProfile(loadedProfile)
        setGenderDraft(loadedProfile?.gender || '')
        setAppointments(appointmentResponse.data.data || [])
        const medicalRecord = medicalResponse.data.data?.record
        setMedicalProfileComplete(
          medicalRecord?.completion_status === 'submitted' &&
            medicalRecord?.completion_percent === 100,
        )

        if (hasGender(loadedProfile)) {
          setDirectoryLoading(true)
          try {
            const directoryResponse = await api.get('/physiotherapists')
            if (active) setClinicians(directoryResponse.data.data || [])
          } catch {
            if (active) {
              setNotice({ key: 'errors.loadClinicians', error: true })
            }
          } finally {
            if (active) setDirectoryLoading(false)
          }
        }
      } catch {
        // The booking panel renders its localized profile-load error.
      } finally {
        if (active) setInitialLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!recordedGender) {
      setDays({})
      setSelectedDate('')
      setSelectedSlot('')
      return undefined
    }

    let active = true

    async function loadAvailability() {
      setAvailabilityLoading(true)
      setAvailabilityError(false)
      setSelectedSlot('')
      try {
        const params = { from: range.from, to: range.to }
        if (selectedDoctorId) {
          params.physiotherapist_id = selectedDoctorId
        }
        const response = await api.get('/appointments/availability', { params })
        if (!active) return

        const availability = response.data.data || {}
        const nextDays = availability.days || {}
        setDays(nextDays)
        setTimeZone(availability.time_zone || 'UTC')
        setSelectedDate((current) => {
          if (current && nextDays[current]?.length) return current
          return (
            Object.keys(nextDays)
              .sort()
              .find((key) => key >= today && nextDays[key]?.length) || ''
          )
        })
      } catch {
        if (active) {
          setDays({})
          setSelectedDate('')
          setAvailabilityError(true)
        }
      } finally {
        if (active) setAvailabilityLoading(false)
      }
    }

    loadAvailability()
    return () => {
      active = false
    }
  }, [
    availabilityRefresh,
    range.from,
    range.to,
    recordedGender,
    selectedDoctorId,
    today,
  ])

  async function saveGender(event) {
    event.preventDefault()
    if (!supportedGenders.has(genderDraft)) return

    setSavingGender(true)
    setNotice(null)
    try {
      const response = await api.patch('/profile/me', { gender: genderDraft })
      const updatedProfile = {
        ...profile,
        ...(response.data.data || {}),
        gender: genderDraft,
      }
      setProfile(updatedProfile)

      try {
        const storedProfile = JSON.parse(
          localStorage.getItem('user_profile') || '{}',
        )
        localStorage.setItem(
          'user_profile',
          JSON.stringify({ ...storedProfile, gender: genderDraft }),
        )
      } catch {
        // A malformed cached profile should not prevent saving the server profile.
      }

      setNotice({ key: 'notice.profileSaved', error: false })
      try {
        await refreshClinicians()
      } catch {
        setNotice({ key: 'errors.loadClinicians', error: true })
      }
    } catch {
      setNotice({ key: 'errors.saveProfile', error: true })
    } finally {
      setSavingGender(false)
    }
  }

  function changeMonth(amount) {
    setMonth(
      (current) =>
        new Date(
          Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth() + amount,
            1,
          ),
        ),
    )
    setSelectedDate('')
    setSelectedSlot('')
  }

  function chooseDoctor(doctorId) {
    setSelectedDoctorId(doctorId)
    setSelectedDate('')
    setSelectedSlot('')
    setNotice(null)
  }

  function chooseDoctorFromCard(clinician) {
    chooseDoctor(clinician.profile_id)
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    bookingPanelRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    window.requestAnimationFrame(() => doctorSelectRef.current?.focus())
  }

  async function submit(event) {
    event.preventDefault()
    if (!recordedGender || !selectedSlot) return
    if (!medicalProfileComplete) {
      setNotice({ text: 'يجب تعبئة ملف المريض قبل حجز الموعد.', error: true })
      return
    }

    setSubmitting(true)
    setNotice(null)
    try {
      const payload = {
        treatment_type: booking.treatment_type.trim(),
        starts_at: selectedSlot,
        notes: booking.notes.trim(),
      }
      if (selectedDoctorId) {
        payload.physiotherapist_id = selectedDoctorId
      }

      const response = await api.post('/appointments', payload)
      const assignedName = personName(response.data.data?.assigned_doctor)
      setNotice({
        key: assignedName
          ? 'notice.appointmentRequestedWith'
          : 'notice.appointmentRequested',
        values: assignedName ? { name: assignedName } : undefined,
        error: false,
      })
      setBooking(blankBooking)
      setSelectedSlot('')
      setAvailabilityRefresh((value) => value + 1)

      try {
        await refreshAppointments()
      } catch {
        setNotice({ key: 'errors.refreshAppointments', error: true })
      }
    } catch (requestError) {
      const serverMessage = requestError.response?.data?.message
      setNotice({
        text: serverMessage === 'يجب تعبئة ملف المريض قبل حجز الموعد.'
          ? serverMessage
          : requestError.response?.status === 409
            ? 'عذراً، هذا الموعد لم يعد متاحاً. يرجى اختيار موعد آخر.'
            : undefined,
        key: 'errors.bookAppointment',
        error: true,
      })
      if (requestError.response?.status === 409) {
        setSelectedSlot('')
        setAvailabilityRefresh((value) => value + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function cancel(id) {
    setNotice(null)
    setCancellingId(id)
    try {
      await api.patch(`/appointments/${id}/cancel`)
      setNotice({ key: 'notice.appointmentCancelled', error: false })
      setAvailabilityRefresh((value) => value + 1)
      try {
        await refreshAppointments()
      } catch {
        setNotice({ key: 'errors.refreshAfterCancel', error: true })
      }
    } catch {
      setNotice({ key: 'errors.cancelAppointment', error: true })
    } finally {
      setCancellingId('')
    }
  }

  const upcoming = appointments.filter(
    (appointment) =>
      ['pending', 'confirmed'].includes(appointment.status) &&
      new Date(appointment.starts_at) > new Date(),
  )
  const availableDates = Object.values(days).filter(
    (slots) => slots?.length,
  ).length
  const previousMonthDisabled = range.from <= monthRange(currentMonth).from

  return (
    <DashboardLayout
      role={t('page.role')}
      title={t('page.title')}
      subtitle={t('page.subtitle')}
    >
      <Notice
        value={notice ? notice.text || t(notice.key, notice.values) : ''}
        error={notice?.error}
      />

      <BookingInstructions className="patient-booking-instructions" />

      {!initialLoading && medicalProfileComplete === false && (
        <section className="panel patient-profile-required" dir="rtl" lang="ar" role="alert">
          <div><p className="eyebrow">خطوة إلزامية قبل الحجز</p><h2>يجب تعبئة ملف المريض قبل حجز الموعد.</h2><p>أكمل الملف الطبي واحفظه ثم أرسله لتتمكن من تأكيد الموعد.</p></div>
          <Link className="button" to="/patient/medical-profile">تعبئة ملف المريض</Link>
        </section>
      )}

      <section
        className="panel patient-booking"
        ref={bookingPanelRef}
        aria-labelledby="book-appointment-title"
      >
        <div className="patient-booking__heading">
          <div>
            <p className="eyebrow">{t('booking.eyebrow')}</p>
            <h2 id="book-appointment-title">{t('booking.title')}</h2>
            <p>{t('booking.description')}</p>
          </div>
          {recordedGender && (
            <span className="patient-time-zone">
              {t('booking.timeZone', { timeZone })}
            </span>
          )}
        </div>

        {initialLoading && (
          <div className="patient-booking-state" role="status">
            <span className="patient-spinner" aria-hidden="true" />
            <span>{t('booking.loading')}</span>
          </div>
        )}

        {!initialLoading && !profile && (
          <div
            className="patient-booking-state patient-booking-state--error"
            role="alert"
          >
            {t('booking.profileError')}
          </div>
        )}

        {!initialLoading && profile && !recordedGender && (
          <div className="patient-profile-completion">
            <div>
              <p className="eyebrow">{t('profile.eyebrow')}</p>
              <h3>{t('profile.title')}</h3>
              <p>{t('profile.description')}</p>
            </div>
            <form onSubmit={saveGender} aria-busy={savingGender}>
              <label>
                <span>{t('common:gender.label')}</span>
                <select
                  value={genderDraft}
                  onChange={(event) => setGenderDraft(event.target.value)}
                  required
                  disabled={savingGender}
                >
                  <option value="">{t('common:gender.select')}</option>
                  <option value="female">{t('common:gender.female')}</option>
                  <option value="male">{t('common:gender.male')}</option>
                </select>
              </label>
              <button
                className="button"
                type="submit"
                disabled={savingGender || !supportedGenders.has(genderDraft)}
              >
                {savingGender ? t('profile.saving') : t('profile.save')}
              </button>
            </form>
          </div>
        )}

        {!initialLoading && recordedGender && (
          <>
            <div className="patient-doctor-filter">
              <label htmlFor="patient-doctor-select">
                <span>{t('filter.label')}</span>
                <select
                  id="patient-doctor-select"
                  ref={doctorSelectRef}
                  value={selectedDoctorId}
                  onChange={(event) => chooseDoctor(event.target.value)}
                  aria-describedby="patient-doctor-help"
                  disabled={directoryLoading}
                >
                  <option value="">{t('filter.any')}</option>
                  {clinicians.map((clinician) => (
                    <option
                      key={clinician.profile_id}
                      value={clinician.profile_id}
                    >
                      {clinician.specialization
                        ? t('filter.optionWithSpecialty', {
                            name: personName(clinician),
                            specialty: clinician.specialization,
                          })
                        : personName(clinician)}
                    </option>
                  ))}
                </select>
              </label>
              <p id="patient-doctor-help">
                {directoryLoading
                  ? t('filter.loading')
                  : selectedClinician
                    ? t('filter.selected', {
                        name: personName(selectedClinician),
                      })
                    : t('filter.automatic')}
              </p>
            </div>

            <div
              className="patient-booking__workspace"
              aria-busy={availabilityLoading}
            >
              <div className="patient-calendar">
                <div className="patient-calendar__toolbar">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    disabled={previousMonthDisabled || availabilityLoading}
                    aria-label={t('calendar.previousMonth')}
                  >
                    <CalendarArrow />
                  </button>
                  <div>
                    <strong>{formatMonth(month, language)}</strong>
                    {!availabilityLoading && !availabilityError && (
                      <small>
                        {availableDates
                          ? t(
                              'calendar.availableDays',
                              pluralValues(availableDates),
                            )
                          : t('calendar.noAvailableDays')}
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    disabled={availabilityLoading}
                    aria-label={t('calendar.nextMonth')}
                  >
                    <CalendarArrow next />
                  </button>
                </div>

                <table
                  className="patient-calendar__grid"
                  aria-label={t('calendar.ariaLabel', {
                    month: formatMonth(month, language),
                  })}
                >
                  <caption className="patient-sr-only">
                    {t('calendar.caption')}
                  </caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map((weekday) => (
                        <th scope="col" key={weekday}>
                          {t(`common:weekdays.short.${weekday}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, weekIndex) => (
                      <tr key={`${range.from}-week-${weekIndex}`}>
                        {week.map((key, dayIndex) => {
                          if (!key) {
                            return (
                              <td
                                aria-hidden="true"
                                key={`${range.from}-empty-${weekIndex}-${dayIndex}`}
                              />
                            )
                          }

                          const slots = days[key] || []
                          const isAvailable = slots.length > 0 && key >= today
                          const isSelected = key === selectedDate
                          const isToday = key === today
                          const localizedDate = formatDate(key, language)
                          const label = isAvailable
                            ? t('calendar.dayAvailable', {
                                date: localizedDate,
                                ...pluralValues(slots.length),
                              })
                            : t('calendar.dayUnavailable', {
                                date: localizedDate,
                              })

                          return (
                            <td key={key}>
                              <button
                                type="button"
                                className={[
                                  'patient-calendar__day',
                                  isAvailable
                                    ? 'patient-calendar__day--available'
                                    : 'patient-calendar__day--unavailable',
                                  isSelected
                                    ? 'patient-calendar__day--selected'
                                    : '',
                                  isToday ? 'patient-calendar__day--today' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                disabled={availabilityLoading}
                                aria-disabled={!isAvailable}
                                aria-label={label}
                                aria-pressed={isSelected}
                                title={!isAvailable ? 'هذا التاريخ غير متاح للحجز، يرجى اختيار تاريخ آخر.' : undefined}
                                onMouseEnter={() => !isAvailable && setUnavailableHint('هذا التاريخ غير متاح للحجز، يرجى اختيار تاريخ آخر.')}
                                onMouseLeave={() => setUnavailableHint('')}
                                onFocus={() => !isAvailable && setUnavailableHint('هذا التاريخ غير متاح للحجز، يرجى اختيار تاريخ آخر.')}
                                onClick={() => {
                                  if (!isAvailable) {
                                    setSelectedDate('')
                                    setSelectedSlot('')
                                    setNotice({ text: 'هذا التاريخ غير متاح للحجز، يرجى اختيار تاريخ آخر.', error: true })
                                    return
                                  }
                                  setSelectedDate(key)
                                  setSelectedSlot('')
                                  setUnavailableHint('')
                                }}
                              >
                                <span>{number(Number(key.slice(-2)))}</span>
                                {isAvailable && (
                                  <span
                                    className="patient-calendar__marker"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="patient-calendar__legend" dir="rtl" lang="ar" aria-label="دليل ألوان التقويم"><span><i className="is-available" aria-hidden="true"/>متاح للحجز</span><span><i className="is-unavailable" aria-hidden="true"/>غير متاح / مكتمل الحجز</span></div>
                {unavailableHint && <p className="patient-calendar__unavailable-message" dir="rtl" lang="ar" role="status">{unavailableHint}</p>}
              </div>

              <div className="patient-slots" aria-live="polite">
                <div className="patient-slots__heading">
                  <div>
                    <p className="eyebrow">{t('calendar.timesEyebrow')}</p>
                    <h3>
                      {selectedDate
                        ? formatShortDate(selectedDate, language)
                        : formatMonth(month, language)}
                    </h3>
                  </div>
                  {selectedDateSlots.length > 0 && (
                    <span>
                      {t(
                        'calendar.timeCount',
                        pluralValues(selectedDateSlots.length),
                      )}
                    </span>
                  )}
                </div>

                {availabilityLoading && (
                  <div className="patient-booking-state" role="status">
                    <span className="patient-spinner" aria-hidden="true" />
                    <span>{t('calendar.checking')}</span>
                  </div>
                )}

                {!availabilityLoading && availabilityError && (
                  <div
                    className="patient-slot-state patient-slot-state--error"
                    role="alert"
                  >
                    <p>{t('errors.loadAvailability')}</p>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setAvailabilityRefresh((value) => value + 1)
                      }
                    >
                      {t('calendar.tryAgain')}
                    </button>
                  </div>
                )}

                {!availabilityLoading &&
                  !availabilityError &&
                  !selectedDate &&
                  availableDates === 0 && (
                    <div className="patient-slot-state">
                      <strong>{t('calendar.emptyMonthTitle')}</strong>
                      <p>{t('calendar.emptyMonthDescription')}</p>
                    </div>
                  )}

                {!availabilityLoading &&
                  !availabilityError &&
                  selectedDate &&
                  selectedDateSlots.length === 0 && (
                    <div className="patient-slot-state">
                      <strong>{t('calendar.emptyDateTitle')}</strong>
                      <p>{t('calendar.emptyDateDescription')}</p>
                    </div>
                  )}

                {!availabilityLoading && selectedDateSlots.length > 0 && (
                  <div
                    className="patient-slot-grid"
                    role="group"
                    aria-label={t('calendar.timesOnDate', {
                      date: formatDate(selectedDate, language),
                    })}
                  >
                    {selectedDateSlots.map((slot) => {
                      const isSelected = slot.starts_at === selectedSlot
                      return (
                        <button
                          type="button"
                          key={slot.starts_at}
                          className={`patient-slot ${
                            isSelected ? 'patient-slot--selected' : ''
                          }`}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedSlot(slot.starts_at)}
                        >
                          <strong>
                            {formatTime(slot.starts_at, language)}
                          </strong>
                          {!selectedDoctorId && (
                            <small>
                              {t(
                                'calendar.doctorCount',
                                pluralValues(slot.available_doctor_count),
                              )}
                            </small>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {selectedSlotDetails && (
              <form
                className="patient-booking-details"
                onSubmit={submit}
                aria-busy={submitting}
              >
                <div className="patient-booking-summary">
                  <div>
                    <span>{t('details.dateTime')}</span>
                    <strong>
                      {t('details.dateAtTime', {
                        date: formatShortDate(selectedDate, language),
                        time: formatTime(
                          selectedSlotDetails.starts_at,
                          language,
                        ),
                      })}
                    </strong>
                  </div>
                  <div>
                    <span>{t('details.physiotherapist')}</span>
                    <strong>
                      {selectedClinician
                        ? personName(selectedClinician)
                        : t('details.automaticallyAssigned')}
                    </strong>
                  </div>
                </div>

                <div className="patient-booking-fields">
                  <label>
                    <span>{t('details.treatmentType')}</span>
                    <input
                      value={booking.treatment_type}
                      onChange={(event) =>
                        setBooking({
                          ...booking,
                          treatment_type: event.target.value,
                        })
                      }
                      placeholder={t('details.treatmentPlaceholder')}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label>
                    <span>{t('details.notes')}</span>
                    <textarea
                      value={booking.notes}
                      onChange={(event) =>
                        setBooking({ ...booking, notes: event.target.value })
                      }
                      placeholder={t('details.notesPlaceholder')}
                      disabled={submitting}
                    />
                  </label>
                </div>

                {!selectedClinician && (
                  <p className="patient-assignment-note">
                    {t('details.assignmentNote')}
                  </p>
                )}

                {!medicalProfileComplete && <div className="patient-booking-profile-lock" dir="rtl" lang="ar"><strong>يجب تعبئة ملف المريض قبل حجز الموعد.</strong><Link to="/patient/medical-profile">تعبئة ملف المريض</Link></div>}
                <button className="button" type="submit" disabled={submitting || !medicalProfileComplete}>
                  {submitting ? t('details.requesting') : language === 'ar' ? 'تأكيد الحجز' : t('details.request')}
                </button>
              </form>
            )}
          </>
        )}
      </section>

      {appointments.some((appointment) =>
        !['cancelled', 'rejected'].includes(appointment.status),
      ) && (
        <section className="panel patient-medical-cta" aria-labelledby="medical-profile-title">
          <div>
            <p className="eyebrow">Dossier patient / ملف المريض</p>
            <h2 id="medical-profile-title">Compléter le dossier médical</h2>
            <h3 dir="rtl" lang="ar">استكمال الملف الطبي</h3>
            <p>Préparez votre première séance, enregistrez un brouillon et revenez le compléter à tout moment.</p>
            <p dir="rtl" lang="ar">استعد لجلستك الأولى، واحفظ مسودة ثم عُد لإكمالها في أي وقت.</p>
          </div>
          <Link className="button" to="/patient/medical-profile">
            Compléter / استكمال
          </Link>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{t('appointments.title')}</h2>
            <p>{t('appointments.description')}</p>
          </div>
        </div>
        {upcoming.length > 0 ? (
          <div className="appointment-list">
            {upcoming.map((appointment) => (
              <article key={appointment.id}>
                <div className="date-tile">
                  <strong>
                    {formatUtcDate(appointment.starts_at, language, {
                      day: 'numeric',
                    })}
                  </strong>
                  <span>
                    {formatUtcDate(appointment.starts_at, language, {
                      month: 'short',
                    })}
                  </span>
                </div>
                <div>
                  <strong>{appointment.treatment_type}</strong>
                  <span>
                    {t('appointments.with', {
                      name: personName(appointment.profiles),
                    })}
                  </span>
                  <small>
                    {formatDateTime(appointment.starts_at, language)}
                  </small>
                </div>
                <span
                  className={`badge ${
                    appointment.status === 'confirmed' ? 'badge--green' : ''
                  }`}
                >
                  {t(`common:statuses.${appointment.status}`)}
                </span>
                <button
                  className="text-button text-button--danger"
                  type="button"
                  onClick={() => cancel(appointment.id)}
                  disabled={cancellingId === appointment.id}
                >
                  {cancellingId === appointment.id
                    ? t('common:state.working')
                    : t('common:actions.cancel')}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>{t('appointments.emptyTitle')}</strong>
            <span>{t('appointments.emptyDescription')}</span>
          </div>
        )}
      </section>

      {recordedGender && (
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t('clinicians.eyebrow')}</p>
              <h2>{t('clinicians.title')}</h2>
            </div>
            <p>{t('clinicians.description')}</p>
          </div>

          {directoryLoading && (
            <div className="panel patient-booking-state" role="status">
              <span className="patient-spinner" aria-hidden="true" />
              <span>{t('clinicians.loading')}</span>
            </div>
          )}

          {!directoryLoading && clinicians.length === 0 && (
            <div className="panel empty">{t('clinicians.empty')}</div>
          )}

          {!directoryLoading && clinicians.length > 0 && (
            <div className="clinician-grid">
              {clinicians.map((clinician) => {
                const isSelected = clinician.profile_id === selectedDoctorId
                const name = personName(clinician)
                return (
                  <article
                    className={`clinician-card patient-clinician-card ${
                      isSelected ? 'patient-clinician-card--selected' : ''
                    }`}
                    key={clinician.profile_id}
                  >
                    <div className="clinician-photo">
                      {clinician.profile_image ? (
                        <img
                          src={clinician.profile_image}
                          alt={t('clinicians.portraitAlt', { name })}
                        />
                      ) : (
                        <span aria-hidden="true">
                          {clinician.profiles?.first_name?.[0]}
                          {clinician.profiles?.last_name?.[0]}
                        </span>
                      )}
                      <span className="available-dot">
                        {t('clinicians.accepting')}
                      </span>
                    </div>
                    <div className="clinician-body">
                      <p className="eyebrow">{clinician.professional_title}</p>
                      <h3>{name}</h3>
                      <strong className="specialty">
                        {clinician.specialization}
                      </strong>
                      <p>
                        {clinician.biography || t('clinicians.defaultBiography')}
                      </p>
                      <div className="clinician-facts">
                        <span>
                          <strong>
                            {t(
                              'clinicians.years',
                              pluralValues(
                                Number(clinician.years_of_experience) || 0,
                              ),
                            )}
                          </strong>
                        </span>
                        <span>
                          <strong>
                            {t(
                              'clinicians.minutes',
                              pluralValues(
                                Number(clinician.consultation_duration) || 0,
                              ),
                            )}
                          </strong>
                        </span>
                      </div>
                      <button
                        className={`button ${
                          isSelected ? 'patient-doctor-button--selected' : ''
                        }`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => chooseDoctorFromCard(clinician)}
                      >
                        {isSelected
                          ? t('clinicians.selected')
                          : t('clinicians.viewAvailability')}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </DashboardLayout>
  )
}
