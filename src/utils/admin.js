import { supabase } from '../supabase';
import { generateSalt, hashPasskey } from './passkey';

const ADMIN_SESSION_KEY = 'pft_admin_session';
const ADMIN_PASSWORD_KEY = 'pft_admin_password';

export const ADMIN_USERNAME = 'admin';

export function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function getAdminPassword() {
  return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '';
}

export function setAdminSession(password) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
}

export function validateAdminLogin(username, password) {
  if (username.trim().toLowerCase() !== ADMIN_USERNAME) {
    return 'Invalid admin username';
  }
  if (password !== 'pass123') {
    return 'Invalid admin password';
  }
  return null;
}

async function adminRpc(fn, params) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

export async function adminFetchProfiles(password) {
  return adminRpc('admin_get_profiles', { p_password: password });
}

export async function adminCreateProfile(password, authUserId, name, passkey) {
  const salt = generateSalt();
  const passkeyHash = await hashPasskey(passkey, salt);
  const rows = await adminRpc('admin_create_profile', {
    p_password: password,
    p_auth_user_id: authUserId,
    p_name: name.trim(),
    p_passkey_hash: passkeyHash,
    p_passkey_salt: salt,
  });
  return rows[0];
}

export async function adminDeleteProfile(password, profileId) {
  await adminRpc('admin_delete_profile', {
    p_password: password,
    p_profile_id: profileId,
  });
}

export async function adminFetchCategories(password) {
  return adminRpc('admin_get_categories', { p_password: password });
}

export async function adminUpdateCategoryLabel(password, categoryId, label) {
  await adminRpc('admin_update_category_label', {
    p_password: password,
    p_category_id: categoryId,
    p_label: label.trim(),
  });
}

export async function adminFetchTags(password, categoryId) {
  return adminRpc('admin_get_tags', {
    p_password: password,
    p_category_id: categoryId,
  });
}

export async function adminCreateTag(password, categoryId, label) {
  const rows = await adminRpc('admin_create_tag', {
    p_password: password,
    p_category_id: categoryId,
    p_label: label.trim(),
  });
  return rows[0];
}

export async function adminUpdateTagLabel(password, tagId, label) {
  await adminRpc('admin_update_tag_label', {
    p_password: password,
    p_tag_id: tagId,
    p_label: label.trim(),
  });
}

export async function adminDeleteTag(password, tagId) {
  await adminRpc('admin_delete_tag', {
    p_password: password,
    p_tag_id: tagId,
  });
}

export async function verifyAdminAccess(password) {
  await adminFetchProfiles(password);
}
