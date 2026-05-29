import { useState } from 'react';
import {
  validateAdminLogin,
  verifyAdminAccess,
  setAdminSession,
} from '../utils/admin';

export default function AdminLogin({ onSuccess, onCancel }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateAdminLogin(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await verifyAdminAccess(password);
      setAdminSession(password);
      onSuccess();
    } catch (err) {
      const message = err?.message?.includes('Invalid admin credentials')
        ? 'Invalid admin credentials'
        : 'Admin access unavailable. Run supabase/migrations/002_admin_functions.sql first.';
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = username.trim() && password.length >= 4 && !submitting;

  return (
    <section className="user-select fade-in">
      <div className="field-group field-group--centered">
        <span className="field-label">Admin username</span>
        <input
          type="text"
          className="text-input landing-control"
          placeholder="admin"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
          autoComplete="username"
          autoFocus
        />
      </div>

      <div className="field-group field-group--centered">
        <label htmlFor="admin-password" className="field-label">Password</label>
        <input
          id="admin-password"
          type="password"
          className="text-input landing-control"
          placeholder="Enter password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
        />
      </div>

      {error && <p className="field-error field-error--centered">{error}</p>}

      <div className="landing-actions">
        <button
          type="button"
          className="primary-btn landing-control"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? 'Signing in…' : 'Admin sign in'}
        </button>
        <button type="button" className="add-user-link" onClick={onCancel}>
          Back to users
        </button>
      </div>
    </section>
  );
}
