import { addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { profileDoc, profilesCollection } from './paths';
import { seedCategories } from './categories';
import { hashPasskey, generateSalt, verifyPasskey } from './passkey';

const STORAGE_PREFIX = 'pft_active_profile_';

export function saveActiveProfile(authUid, profile) {
  localStorage.setItem(`${STORAGE_PREFIX}${authUid}`, JSON.stringify(profile));
}

export function loadActiveProfile(authUid) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${authUid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveProfile(authUid) {
  localStorage.removeItem(`${STORAGE_PREFIX}${authUid}`);
}

export async function createProfile(authUid, name, passkey) {
  const trimmed = name.trim();
  const salt = generateSalt();
  const passkeyHash = await hashPasskey(passkey, salt);

  const docRef = await addDoc(profilesCollection(authUid), {
    name: trimmed,
    passkeyHash,
    passkeySalt: salt,
    createdAt: serverTimestamp(),
  });

  const profile = { id: docRef.id, name: trimmed };
  await seedCategories(authUid, profile.id);
  return profile;
}

export async function verifyProfilePasskey(authUid, profileId, passkey) {
  const snapshot = await getDoc(profileDoc(authUid, profileId));
  if (!snapshot.exists()) return false;

  const { passkeyHash, passkeySalt } = snapshot.data();
  if (!passkeyHash) return true;

  return verifyPasskey(passkey, passkeySalt, passkeyHash);
}
