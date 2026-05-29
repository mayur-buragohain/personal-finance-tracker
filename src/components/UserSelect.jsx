import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { profilesCollection } from '../utils/paths';
import { createProfile, verifyProfilePasskey } from '../utils/profiles';
import { validatePasskey } from '../utils/passkey';

export default function UserSelect({ authUid, onSelectProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(profilesCollection(authUid), (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        hasPasskey: Boolean(d.data().passkeyHash),
      }));
      items.sort((a, b) => a.name.localeCompare(b.name));
      setProfiles(items);
    });

    return () => unsubscribe();
  }, [authUid]);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId('');
      return;
    }
    if (!profiles.some((p) => p.id === selectedProfileId)) {
      setSelectedProfileId('');
    }
  }, [profiles, selectedProfileId]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const resetCreateForm = () => {
    setNewName('');
    setNewPasskey('');
    setConfirmPasskey('');
    setCreateError('');
  };

  const openCreateForm = () => {
    resetCreateForm();
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    resetCreateForm();
  };

  const handleSignIn = async () => {
    if (!selectedProfile) {
      setError('Select a user');
      return;
    }

    if (selectedProfile.hasPasskey) {
      const passkeyError = validatePasskey(passkey);
      if (passkeyError) {
        setError(passkeyError);
        return;
      }
    }

    setError('');
    setSigningIn(true);

    try {
      if (selectedProfile.hasPasskey) {
        const valid = await verifyProfilePasskey(authUid, selectedProfile.id, passkey);
        if (!valid) {
          setError('Incorrect passkey');
          return;
        }
      }
      onSelectProfile({ id: selectedProfile.id, name: selectedProfile.name });
    } catch (err) {
      setError('Could not sign in');
      console.error(err);
    } finally {
      setSigningIn(false);
    }
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
      const profile = await createProfile(authUid, name, newPasskey);
      closeCreateForm();
      onSelectProfile(profile);
    } catch (err) {
      setCreateError('Failed to create user');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const canSignIn =
    selectedProfile &&
    (selectedProfile.hasPasskey ? passkey.length >= 4 : true) &&
    !signingIn;

  const canCreate =
    newName.trim() &&
    newPasskey.length >= 4 &&
    confirmPasskey.length >= 4 &&
    !creating;

  return (
    <section className="user-select fade-in">
      <div className="field-group field-group--centered">
        <label htmlFor="user-select" className="field-label">Username</label>
        <select
          id="user-select"
          className="text-input select-input landing-control"
          value={selectedProfileId}
          onChange={(e) => {
            setSelectedProfileId(e.target.value);
            setPasskey('');
            setError('');
          }}
        >
          <option value="">
            {profiles.length === 0 ? 'No users yet' : 'Select user'}
          </option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group field-group--centered">
        <label htmlFor="signin-passkey" className="field-label">Passkey</label>
        <input
          id="signin-passkey"
          type="password"
          className="text-input landing-control"
          placeholder={
            selectedProfile && !selectedProfile.hasPasskey
              ? 'No passkey required'
              : 'Enter passkey'
          }
          value={passkey}
          onChange={(e) => {
            setPasskey(e.target.value);
            setError('');
          }}
          maxLength={32}
          autoComplete="current-password"
          disabled={!selectedProfile || (selectedProfile && !selectedProfile.hasPasskey)}
          onKeyDown={(e) => e.key === 'Enter' && canSignIn && handleSignIn()}
        />
      </div>

      {error && <p className="field-error field-error--centered">{error}</p>}

      <div className="landing-actions">
        <button
          type="button"
          className="primary-btn landing-control"
          disabled={!canSignIn}
          onClick={handleSignIn}
        >
          {signingIn ? 'Signing in…' : 'Continue'}
        </button>
        <button type="button" className="add-user-link" onClick={openCreateForm}>
          + Add user
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={closeCreateForm}>
          <div
            className="bottom-sheet slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="create-user-title"
          >
            <div className="sheet-handle" />
            <h2 id="create-user-title" className="sheet-title">Add new user</h2>

            <div className="field-group field-group--centered">
              <label htmlFor="new-user-name" className="field-label">Name</label>
              <input
                id="new-user-name"
                type="text"
                className="text-input landing-control"
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

            <div className="field-group field-group--centered">
              <label htmlFor="new-passkey" className="field-label">Passkey</label>
              <input
                id="new-passkey"
                type="password"
                className="text-input landing-control"
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

            <div className="field-group field-group--centered">
              <label htmlFor="confirm-passkey" className="field-label">Confirm passkey</label>
              <input
                id="confirm-passkey"
                type="password"
                className="text-input landing-control"
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
                {creating ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
