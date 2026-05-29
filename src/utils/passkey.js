export function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPasskey(passkey, salt) {
  const data = new TextEncoder().encode(`${salt}:${passkey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

export async function verifyPasskey(passkey, salt, storedHash) {
  const hash = await hashPasskey(passkey, salt);
  return hash === storedHash;
}

export const MIN_PASSKEY_LENGTH = 4;

export function validatePasskey(passkey) {
  if (!passkey || passkey.length < MIN_PASSKEY_LENGTH) {
    return `Passkey must be at least ${MIN_PASSKEY_LENGTH} characters`;
  }
  return null;
}
