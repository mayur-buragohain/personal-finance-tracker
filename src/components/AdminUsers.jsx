import { useCallback, useEffect, useState } from 'react';
import { formatDisplayDate } from '../utils/helpers';
import {
  adminCreateProfile,
  adminDeleteProfile,
  adminFetchProfiles,
  getAdminPassword,
} from '../utils/admin';
import { validatePasskey } from '../utils/passkey';

export default function AdminUsers({ authUid }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetchProfiles(getAdminPassword());
      setProfiles(data || []);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const resetCreateForm = () => {
    setNewName('');
    setNewPasskey('');
    setConfirmPasskey('');
    setCreateError('');
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    resetCreateForm();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a name');
      return;
    }
    if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setCreateError('This user already exists');
      return;
    }

    const passkeyError = validatePasskey(newPasskey);
    if (passkeyError) {
      setCreateError(passkeyError);
      return;
    }
    if (newPasskey !== confirmPasskey) {
      setCreateError('Passkeys do not match');
      return;
    }

    setCreateError('');
    setCreating(true);

    try {
      await adminCreateProfile(getAdminPassword(), authUid, name, newPasskey);
      closeCreateForm();
      await loadProfiles();
    } catch (err) {
      setCreateError(err?.message?.includes('reserved') ? 'This username is reserved' : 'Failed to create user');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (profile) => {
    if (!window.confirm(`Delete user "${profile.name}"? This removes their categories and expenses.`)) {
      return;
    }

    setDeletingId(profile.id);
    try {
      await adminDeleteProfile(getAdminPassword(), profile.id);
      await loadProfiles();
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const canCreate =
    newName.trim() &&
    newPasskey.length >= 4 &&
    confirmPasskey.length >= 4 &&
    !creating;

  if (loading) {
    return (
      <div className="admin-panel-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <section className="panel fade-in">
      <div className="admin-panel-header">
        <h2 className="section-title">Users</h2>
        <button type="button" className="primary-btn admin-add-btn" onClick={() => setShowCreateForm(true)}>
          + Add user
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {profiles.length === 0 ? (
        <div className="empty-state compact">
          <span className="empty-icon">👥</span>
          <h2>No users yet</h2>
          <p>Add a user to get started.</p>
        </div>
      ) : (
        <ul className="admin-list">
          {profiles.map((profile) => (
            <li key={profile.id} className="admin-list-row">
              <div className="admin-list-main">
                <span className="admin-list-title">{profile.name}</span>
                <span className="admin-list-meta">
                  Created {formatDisplayDate(profile.created_at.slice(0, 10))}
                </span>
              </div>
              <button
                type="button"
                className="delete-btn"
                disabled={deletingId === profile.id}
                onClick={() => handleDelete(profile)}
                aria-label={`Delete ${profile.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={closeCreateForm}>
          <div
            className="bottom-sheet slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="admin-create-user-title"
          >
            <div className="sheet-handle" />
            <h2 id="admin-create-user-title" className="sheet-title">Add user</h2>

            <div className="field-group">
              <label htmlFor="admin-new-user-name" className="field-label">Name</label>
              <input
                id="admin-new-user-name"
                type="text"
                className="text-input"
                placeholder="Enter name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setCreateError('');
                }}
                maxLength={40}
                autoFocus
              />
            </div>

            <div className="field-group">
              <label htmlFor="admin-new-passkey" className="field-label">Passkey</label>
              <input
                id="admin-new-passkey"
                type="password"
                className="text-input"
                placeholder="Min. 4 characters"
                value={newPasskey}
                onChange={(e) => {
                  setNewPasskey(e.target.value);
                  setCreateError('');
                }}
                maxLength={32}
                autoComplete="new-password"
              />
            </div>

            <div className="field-group">
              <label htmlFor="admin-confirm-passkey" className="field-label">Confirm passkey</label>
              <input
                id="admin-confirm-passkey"
                type="password"
                className="text-input"
                placeholder="Re-enter passkey"
                value={confirmPasskey}
                onChange={(e) => {
                  setConfirmPasskey(e.target.value);
                  setCreateError('');
                }}
                maxLength={32}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
              />
            </div>

            {createError && <p className="field-error">{createError}</p>}

            <div className="sheet-actions">
              <button type="button" className="secondary-btn" onClick={closeCreateForm}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                {creating ? 'Adding…' : 'Add user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
