import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import './SignIn.css'
import './Register.css'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/signup', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      const { session, profile, requiresEmailConfirmation } = response.data.data

      if (requiresEmailConfirmation) {
        setSuccess(response.data.message)
        return
      }

      localStorage.setItem('supabase_session', JSON.stringify(session))
      localStorage.setItem('user_profile', JSON.stringify(profile))
      navigate('/patient/dashboard', { replace: true })
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to create account',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signin-page register-page">
      <section className="signin-intro" aria-label="Clinic introduction">
        <div className="signin-brand">
          <span className="signin-brand__mark" aria-hidden="true">+</span>
          <span>PhysioCare Clinic</span>
        </div>
        <div className="signin-intro__content">
          <p className="signin-eyebrow">Start your recovery journey</p>
          <h1>Care designed around your progress.</h1>
          <p>Create your patient account to manage appointments and follow your care plan.</p>
        </div>
      </section>

      <section className="signin-panel">
        <form className="signin-card register-card" onSubmit={handleSubmit}>
          <div className="signin-card__heading">
            <p className="signin-mobile-brand">PhysioCare Clinic</p>
            <h2>Create an account</h2>
            <p>Enter your details to create a patient account.</p>
          </div>

          {error && <div className="signin-error" role="alert">{error}</div>}
          {success && (
            <div className="register-success" role="status">
              <strong>{success}</strong>
              <span>After confirming, return here to sign in.</span>
            </div>
          )}

          {!success && (
            <>
              <div className="register-name-row">
                <label className="signin-field">
                  <span>First name</span>
                  <input name="firstName" value={form.firstName} onChange={updateField} autoComplete="given-name" required disabled={loading} />
                </label>
                <label className="signin-field">
                  <span>Last name</span>
                  <input name="lastName" value={form.lastName} onChange={updateField} autoComplete="family-name" required disabled={loading} />
                </label>
              </div>

              <label className="signin-field">
                <span>Gender</span>
                <select name="gender" value={form.gender} onChange={updateField} required disabled={loading}>
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>

              <label className="signin-field">
                <span>Email address</span>
                <input type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" required disabled={loading} />
              </label>
              <label className="signin-field">
                <span>Password</span>
                <input type="password" name="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="8" required disabled={loading} />
              </label>
              <label className="signin-field">
                <span>Confirm password</span>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" minLength="8" required disabled={loading} />
              </label>

              <button className="signin-submit" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </>
          )}

          <p className="signin-register">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Register
