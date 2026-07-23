import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../services/api.js'
import DashboardLayout, { Notice } from './DashboardLayout.jsx'
import './PatientDashboard.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
    ...Array.from({ length: lastDay }, (_, index) => dateKey(year, monthIndex, index + 1)),
  ]

  while (cells.length % 7) cells.push(null)

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  )
}

function formatMonth(month) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(month)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function formatTime(value) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function personName(person) {
  const profile = person?.profiles || person
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
}

function hasGender(profile) {
  return supportedGenders.has(profile?.gender)
}

export default function PatientDashboard() {
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
  const [availabilityError, setAvailabilityError] = useState('')
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0)
  const [savingGender, setSavingGender] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      setError('')
      try {
        const [profileResponse, appointmentResponse] = await Promise.all([
          api.get('/profile/me'),
          api.get('/appointments/my'),
        ])
        if (!active) return

        const loadedProfile = profileResponse.data.data
        setProfile(loadedProfile)
        setGenderDraft(loadedProfile?.gender || '')
        setAppointments(appointmentResponse.data.data || [])

        if (hasGender(loadedProfile)) {
          setDirectoryLoading(true)
          try {
            const directoryResponse = await api.get('/physiotherapists')
            if (active) setClinicians(directoryResponse.data.data || [])
          } finally {
            if (active) setDirectoryLoading(false)
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load dashboard')
        }
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
      setAvailabilityError('')
      setSelectedSlot('')
      try {
        const params = { from: range.from, to: range.to }
        if (selectedDoctorId) params.physiotherapist_id = selectedDoctorId
        const response = await api.get('/appointments/availability', { params })
        if (!active) return

        const availability = response.data.data || {}
        const nextDays = availability.days || {}
        setDays(nextDays)
        setTimeZone(availability.time_zone || 'UTC')
        setSelectedDate((current) => {
          if (current && nextDays[current]?.length) return current
          return Object.keys(nextDays)
            .sort()
            .find((key) => key >= today && nextDays[key]?.length) || ''
        })
      } catch (requestError) {
        if (active) {
          setDays({})
          setSelectedDate('')
          setAvailabilityError(
            requestError.response?.data?.message || 'Unable to load available times',
          )
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
    setError('')
    setMessage('')
    try {
      const response = await api.patch('/profile/me', { gender: genderDraft })
      const updatedProfile = {
        ...profile,
        ...(response.data.data || {}),
        gender: genderDraft,
      }
      setProfile(updatedProfile)

      try {
        const storedProfile = JSON.parse(localStorage.getItem('user_profile') || '{}')
        localStorage.setItem(
          'user_profile',
          JSON.stringify({ ...storedProfile, gender: genderDraft }),
        )
      } catch {
        // A malformed cached profile should not prevent saving the server profile.
      }

      await refreshClinicians()
      setMessage('Profile completed. Available clinicians are now matched to you.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save profile')
    } finally {
      setSavingGender(false)
    }
  }

  function changeMonth(amount) {
    setMonth(
      (current) =>
        new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1),
        ),
    )
    setSelectedDate('')
    setSelectedSlot('')
  }

  function chooseDoctor(doctorId) {
    setSelectedDoctorId(doctorId)
    setSelectedDate('')
    setSelectedSlot('')
    setMessage('')
    setError('')
  }

  function chooseDoctorFromCard(clinician) {
    chooseDoctor(clinician.profile_id)
    bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.requestAnimationFrame(() => doctorSelectRef.current?.focus())
  }

  async function submit(event) {
    event.preventDefault()
    if (!recordedGender || !selectedSlot) return

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        treatment_type: booking.treatment_type.trim(),
        starts_at: selectedSlot,
        notes: booking.notes.trim(),
      }
      if (selectedDoctorId) payload.physiotherapist_id = selectedDoctorId

      const response = await api.post('/appointments', payload)
      const assignedDoctor = response.data.data?.assigned_doctor
      const assignedName = personName(assignedDoctor)
      setMessage(
        assignedName
          ? `Appointment requested successfully with ${assignedName}.`
          : response.data.message || 'Appointment requested successfully.',
      )
      setBooking(blankBooking)
      setSelectedSlot('')
      await refreshAppointments()
      setAvailabilityRefresh((value) => value + 1)
    } catch (requestError) {
      const status = requestError.response?.status
      setError(requestError.response?.data?.message || 'Unable to book appointment')
      if (status === 409) {
        setSelectedSlot('')
        setAvailabilityRefresh((value) => value + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function cancel(id) {
    setError('')
    setMessage('')
    try {
      await api.patch(`/appointments/${id}/cancel`)
      setMessage('Appointment cancelled')
      await refreshAppointments()
      setAvailabilityRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel')
    }
  }

  const upcoming = appointments.filter(
    (appointment) =>
      ['pending', 'confirmed'].includes(appointment.status) &&
      new Date(appointment.starts_at) > new Date(),
  )
  const availableDates = Object.values(days).filter((slots) => slots?.length).length
  const previousMonthDisabled = range.from <= monthRange(currentMonth).from

  return (
    <DashboardLayout
      role="Patient"
      title="Your care, in one place"
      subtitle="Find an available time and arrange an appointment around your schedule."
    >
      <Notice value={error || message} error={Boolean(error)} />

      <section
        className="panel patient-booking"
        ref={bookingPanelRef}
        aria-labelledby="book-appointment-title"
      >
        <div className="patient-booking__heading">
          <div>
            <p className="eyebrow">Book a visit</p>
            <h2 id="book-appointment-title">Choose a date and time</h2>
            <p>
              Pick a physiotherapist or let the clinic assign an available match.
            </p>
          </div>
          {recordedGender && (
            <span className="patient-time-zone">Times shown in {timeZone}</span>
          )}
        </div>

        {initialLoading && (
          <div className="patient-booking-state" role="status">
            <span className="patient-spinner" aria-hidden="true" />
            Loading your booking calendar…
          </div>
        )}

        {!initialLoading && !profile && (
          <div className="patient-booking-state patient-booking-state--error">
            Your profile could not be loaded. Refresh the page to try again.
          </div>
        )}

        {!initialLoading && profile && !recordedGender && (
          <div className="patient-profile-completion">
            <div>
              <p className="eyebrow">One detail needed</p>
              <h3>Complete your profile to see matching clinicians</h3>
              <p>
                The clinic uses this information to apply its clinician-matching
                policy before showing availability.
              </p>
            </div>
            <form onSubmit={saveGender}>
              <label>
                <span>Gender</span>
                <select
                  value={genderDraft}
                  onChange={(event) => setGenderDraft(event.target.value)}
                  required
                  disabled={savingGender}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <button
                className="button"
                type="submit"
                disabled={savingGender || !supportedGenders.has(genderDraft)}
              >
                {savingGender ? 'Saving…' : 'Save and view times'}
              </button>
            </form>
          </div>
        )}

        {!initialLoading && recordedGender && (
          <>
            <div className="patient-doctor-filter">
              <label htmlFor="patient-doctor-select">
                <span>Physiotherapist</span>
                <select
                  id="patient-doctor-select"
                  ref={doctorSelectRef}
                  value={selectedDoctorId}
                  onChange={(event) => chooseDoctor(event.target.value)}
                >
                  <option value="">Any available physiotherapist</option>
                  {clinicians.map((clinician) => (
                    <option key={clinician.profile_id} value={clinician.profile_id}>
                      {personName(clinician)}
                      {clinician.specialization ? ` — ${clinician.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                {directoryLoading
                  ? 'Loading clinicians…'
                  : selectedClinician
                    ? `Showing times for ${personName(selectedClinician)}.`
                    : 'We will randomly assign an eligible clinician who is free at your selected time.'}
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
                    aria-label="Show previous month"
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <div>
                    <strong>{formatMonth(month)}</strong>
                    {!availabilityLoading && !availabilityError && (
                      <small>
                        {availableDates
                          ? `${availableDates} available ${availableDates === 1 ? 'day' : 'days'}`
                          : 'No available days'}
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    disabled={availabilityLoading}
                    aria-label="Show next month"
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>

                <table
                  className="patient-calendar__grid"
                  aria-label={`${formatMonth(month)} appointment calendar`}
                >
                  <caption className="patient-sr-only">
                    Select a date with available appointment times
                  </caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map((weekday) => (
                        <th scope="col" key={weekday}>
                          {weekday}
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
                          const label = `${formatDate(key)}. ${
                            isAvailable
                              ? `${slots.length} available ${slots.length === 1 ? 'time' : 'times'}`
                              : 'No available times'
                          }`

                          return (
                            <td key={key}>
                              <button
                                type="button"
                                className={[
                                  'patient-calendar__day',
                                  isAvailable ? 'patient-calendar__day--available' : '',
                                  isSelected ? 'patient-calendar__day--selected' : '',
                                  isToday ? 'patient-calendar__day--today' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                disabled={!isAvailable || availabilityLoading}
                                aria-label={label}
                                aria-pressed={isSelected}
                                onClick={() => {
                                  setSelectedDate(key)
                                  setSelectedSlot('')
                                }}
                              >
                                <span>{Number(key.slice(-2))}</span>
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
              </div>

              <div className="patient-slots" aria-live="polite">
                <div className="patient-slots__heading">
                  <div>
                    <p className="eyebrow">Available times</p>
                    <h3>
                      {selectedDate ? formatShortDate(selectedDate) : formatMonth(month)}
                    </h3>
                  </div>
                  {selectedDateSlots.length > 0 && (
                    <span>
                      {selectedDateSlots.length}{' '}
                      {selectedDateSlots.length === 1 ? 'time' : 'times'}
                    </span>
                  )}
                </div>

                {availabilityLoading && (
                  <div className="patient-booking-state" role="status">
                    <span className="patient-spinner" aria-hidden="true" />
                    Checking availability…
                  </div>
                )}

                {!availabilityLoading && availabilityError && (
                  <div className="patient-slot-state patient-slot-state--error">
                    <p>{availabilityError}</p>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setAvailabilityRefresh((value) => value + 1)}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!availabilityLoading &&
                  !availabilityError &&
                  !selectedDate &&
                  availableDates === 0 && (
                    <div className="patient-slot-state">
                      <strong>No times available this month</strong>
                      <p>Try the next month or choose another physiotherapist.</p>
                    </div>
                  )}

                {!availabilityLoading &&
                  !availabilityError &&
                  selectedDate &&
                  selectedDateSlots.length === 0 && (
                    <div className="patient-slot-state">
                      <strong>No times on this date</strong>
                      <p>Choose another marked date in the calendar.</p>
                    </div>
                  )}

                {!availabilityLoading && selectedDateSlots.length > 0 && (
                  <div
                    className="patient-slot-grid"
                    role="group"
                    aria-label={`Times available on ${formatDate(selectedDate)}`}
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
                          <strong>{formatTime(slot.starts_at)}</strong>
                          {!selectedDoctorId && (
                            <small>
                              {slot.available_doctor_count}{' '}
                              {slot.available_doctor_count === 1 ? 'doctor' : 'doctors'}
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
              <form className="patient-booking-details" onSubmit={submit}>
                <div className="patient-booking-summary">
                  <div>
                    <span>Date and time</span>
                    <strong>
                      {formatShortDate(selectedDate)} at{' '}
                      {formatTime(selectedSlotDetails.starts_at)}
                    </strong>
                  </div>
                  <div>
                    <span>Physiotherapist</span>
                    <strong>
                      {selectedClinician
                        ? personName(selectedClinician)
                        : 'Automatically assigned'}
                    </strong>
                  </div>
                </div>

                <div className="patient-booking-fields">
                  <label>
                    <span>Treatment type</span>
                    <input
                      value={booking.treatment_type}
                      onChange={(event) =>
                        setBooking({ ...booking, treatment_type: event.target.value })
                      }
                      placeholder="e.g. Initial assessment"
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label>
                    <span>Reason or notes</span>
                    <textarea
                      value={booking.notes}
                      onChange={(event) =>
                        setBooking({ ...booking, notes: event.target.value })
                      }
                      placeholder="Tell your physiotherapist what brings you in"
                      disabled={submitting}
                    />
                  </label>
                </div>

                {!selectedClinician && (
                  <p className="patient-assignment-note">
                    An eligible physiotherapist will be randomly assigned when your
                    request is submitted.
                  </p>
                )}

                <button className="button" type="submit" disabled={submitting}>
                  {submitting ? 'Requesting appointment…' : 'Request appointment'}
                </button>
              </form>
            )}
          </>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Upcoming appointments</h2>
              <p>Your pending and confirmed visits.</p>
            </div>
          </div>
          <div className="appointment-list">
            {upcoming.map((appointment) => (
              <article key={appointment.id}>
                <div className="date-tile">
                  <strong>
                    {new Date(appointment.starts_at).toLocaleString('en', {
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </strong>
                  <span>
                    {new Date(appointment.starts_at).toLocaleString('en', {
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
                <div>
                  <strong>{appointment.treatment_type}</strong>
                  <span>with {personName(appointment.profiles)}</span>
                  <small>{formatDateTime(appointment.starts_at)}</small>
                </div>
                <span
                  className={`badge ${
                    appointment.status === 'confirmed' ? 'badge--green' : ''
                  }`}
                >
                  {appointment.status}
                </span>
                <button
                  className="text-button text-button--danger"
                  type="button"
                  onClick={() => cancel(appointment.id)}
                >
                  Cancel
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {recordedGender && (
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Our clinical team</p>
              <h2>Choose your physiotherapist</h2>
            </div>
            <p>
              Select a clinician to filter the calendar, or leave the calendar set
              to any available physiotherapist.
            </p>
          </div>

          {directoryLoading && (
            <div className="panel patient-booking-state" role="status">
              <span className="patient-spinner" aria-hidden="true" />
              Loading clinicians…
            </div>
          )}

          {!directoryLoading && clinicians.length === 0 && (
            <div className="panel empty">
              No physiotherapists are currently accepting appointments.
            </div>
          )}

          {!directoryLoading && clinicians.length > 0 && (
            <div className="clinician-grid">
              {clinicians.map((clinician) => {
                const isSelected = clinician.profile_id === selectedDoctorId
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
                          alt={`Portrait of ${personName(clinician)}`}
                        />
                      ) : (
                        <span aria-hidden="true">
                          {clinician.profiles.first_name[0]}
                          {clinician.profiles.last_name[0]}
                        </span>
                      )}
                      <span className="available-dot">Accepting appointments</span>
                    </div>
                    <div className="clinician-body">
                      <p className="eyebrow">{clinician.professional_title}</p>
                      <h3>{personName(clinician)}</h3>
                      <strong className="specialty">{clinician.specialization}</strong>
                      <p>
                        {clinician.biography ||
                          'Dedicated to helping patients move comfortably and confidently.'}
                      </p>
                      <div className="clinician-facts">
                        <span>
                          <strong>{clinician.years_of_experience}</strong> years
                        </span>
                        <span>
                          <strong>{clinician.consultation_duration}</strong> min
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
                        {isSelected ? 'Selected in calendar' : 'View availability'}
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
