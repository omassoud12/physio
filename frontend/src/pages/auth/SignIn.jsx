import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import api, { testBackendConnection } from '../../services/api.js';
import './SignIn.css';

const dashboardByRole = {
  patient: '/patient/dashboard',
  physiotherapist: '/physiotherapist/dashboard',
  admin: '/admin/dashboard',
};

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [database, setDatabase] = useState({
    status: 'checking',
    message: 'Checking database...',
  });

  const checkDatabase = useCallback(async () => {
    setDatabase({ status: 'checking', message: 'Checking database...' });

    try {
      const data = await testBackendConnection();
      setDatabase({
        status: data.database?.connected ? 'connected' : 'unavailable',
        message: data.message,
      });
    } catch (requestError) {
      setDatabase({
        status: 'unavailable',
        message:
          requestError.response?.data?.message || 'Database unavailable',
      });
    }
  }, []);

  useEffect(() => {
    checkDatabase();
  }, [checkDatabase]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/signin', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { session, profile } = response.data.data;
      const dashboard = dashboardByRole[profile.role];

      if (!dashboard) {
        throw new Error('Your account has an unsupported role');
      }

      localStorage.setItem('supabase_session', JSON.stringify(session));
      localStorage.setItem('user_profile', JSON.stringify(profile));
      navigate(dashboard, { replace: true });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        'Unable to sign in. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-intro" aria-label="Clinic introduction">
        <div className="signin-brand">
          <span className="signin-brand__mark" aria-hidden="true">
            +
          </span>
          <span>PhysioCare Clinic</span>
        </div>

        <div className="signin-intro__content">
          <p className="signin-eyebrow">Move better. Feel stronger.</p>
          <h1>Welcome back to your recovery journey.</h1>
          <p>
            Sign in to view appointments, follow your care plan, and stay in
            touch with your physiotherapist.
          </p>
        </div>
      </section>

      <section className="signin-panel">
        <form className="signin-card" onSubmit={handleSubmit}>
          <div className="signin-card__heading">
            <p className="signin-mobile-brand">PhysioCare Clinic</p>
            <h2>Sign in</h2>
            <p>Enter your details to access your account.</p>
          </div>

          <div
            className={`database-status database-status--${database.status}`}
            role="status"
            aria-live="polite"
          >
            <span className="database-status__indicator" aria-hidden="true" />
            <span>{database.message}</span>
            {database.status === 'unavailable' && (
              <button type="button" onClick={checkDatabase}>
                Retry
              </button>
            )}
          </div>

          {error && (
            <div className="signin-error" role="alert">
              {error}
            </div>
          )}

          <label className="signin-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="patient@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="signin-field">
            <span>Password</span>
            <div className="signin-password">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="signin-options">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="signin-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="signin-register">
            New to the clinic? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default SignIn
