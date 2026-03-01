import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ChangelogModal, APP_VERSION } from '../components/changelog-modal.js';

const DEMO_USERS = [
  { email: 'alex.johnson@tvdsb.on.ca', label: 'Alex Johnson', role: 'Student' },
  { email: 'sarah.chen@tvdsb.on.ca', label: 'Sarah Chen', role: 'Teacher' },
  { email: 'david.williams@tvdsb.on.ca', label: 'David Williams', role: 'Guidance' },
  { email: 'lisa.park@tvdsb.on.ca', label: 'Lisa Park', role: 'Principal' },
  { email: 'maria.johnson@tvdsb.on.ca', label: 'Maria Johnson', role: 'Parent' },
  { email: 'james.wilson@tvdsb.on.ca', label: 'James Wilson', role: 'Board Admin' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickLogin(demoEmail: string) {
    setError('');
    setSubmitting(true);
    try {
      await login(demoEmail, 'devpassword123');
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>StudentContext AI</h1>
          <p className="subtitle">Thames Valley District School Board</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-banner">{error}</div>}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@tvdsb.on.ca"
              required
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-section">
          <p className="demo-label">Quick Login (Dev)</p>
          <div className="demo-grid">
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                className="demo-btn"
                onClick={() => handleQuickLogin(u.email)}
                disabled={submitting}
              >
                <span className="demo-name">{u.label}</span>
                <span className="demo-role">{u.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="version-tag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <ChangelogModal />
          <span>— EcoWorks Web Architecture Inc.</span>
        </div>
      </div>
    </div>
  );
}
