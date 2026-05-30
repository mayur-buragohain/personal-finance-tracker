import { supabase } from '../supabase';
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

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, passkey_hash')
    .order('name');

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    hasPasskey: Boolean(row.passkey_hash),
  }));
}

export function subscribeProfiles(onUpdate) {
  const load = async () => {
    try {
      const profiles = await fetchProfiles();
      onUpdate(profiles);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  load();

  const channel = supabase
    .channel('profiles-global')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
      },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function createProfile(name, passkey) {
  const trimmed = name.trim();
  const salt = generateSalt();
  const passkeyHash = await hashPasskey(passkey, salt);

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      name: trimmed,
      passkey_hash: passkeyHash,
      passkey_salt: salt,
    })
    .select('id, name')
    .single();

  if (error) throw error;

  return { id: data.id, name: data.name };
}

export async function verifyProfilePasskey(profileId, passkey) {
  const { data, error } = await supabase
    .from('profiles')
    .select('passkey_hash, passkey_salt')
    .eq('id', profileId)
    .single();

  if (error || !data) return false;
  if (!data.passkey_hash) return true;

  return verifyPasskey(passkey, data.passkey_salt, data.passkey_hash);
}
