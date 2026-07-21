/**
 * Client-side identity helpers — MUST mirror the backend (functions/index.js:
 * normalizeIdentifier / authEmailFor) so email/phone logins resolve to the same
 * Firebase Auth email on both sides.
 *
 * Staff log in with an email OR a phone number. Phone logins have no OTP — they are
 * backed by a synthetic internal email so Firebase email/password auth can be reused.
 */

export function detectIdentifierType(identifier) {
  const s = String(identifier || '').trim();
  if (s.includes('@')) return 'email';
  if (/^[0-9+\-\s()]{6,}$/.test(s)) return 'phone';
  return 'email';
}

export function normalizeIdentifier(identifier, type) {
  const t = type || detectIdentifierType(identifier);
  if (t === 'phone') return String(identifier || '').replace(/[^0-9]/g, '');
  return String(identifier || '').trim().toLowerCase();
}

// The Firebase Auth email used to sign in. Phone -> synthetic internal address.
export function authEmailFor(identifier, appId) {
  const type = detectIdentifierType(identifier);
  const normalized = normalizeIdentifier(identifier, type);
  if (type === 'phone') {
    const safeTenant = String(appId || 'tenant').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'tenant';
    return `phone_${normalized}@${safeTenant}.phone.vowsos.internal`;
  }
  return normalized; // real email
}
