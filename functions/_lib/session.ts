export type SessionEnv = {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

const COOKIE_NAME = '__Host-sihphir_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function equal(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(left)), crypto.subtle.digest('SHA-256', encoder.encode(right))]);
  const a = new Uint8Array(leftHash); const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0);
  return difference === 0;
}

function cookie(request: Request) {
  return request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

export async function authenticate(username: string, password: string, env: SessionEnv) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  const [validUser, validPassword] = await Promise.all([equal(username, env.ADMIN_USERNAME), equal(password, env.ADMIN_PASSWORD)]);
  return validUser && validPassword;
}

export async function createSession(username: string, env: SessionEnv) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not configured.');
  const payload = base64Url(JSON.stringify({ username, expires: Date.now() + SESSION_SECONDS * 1000 }));
  return `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
}

export async function getSession(request: Request, env: SessionEnv): Promise<{ username: string } | null> {
  if (!env.SESSION_SECRET) return null;
  const value = cookie(request); if (!value) return null;
  const [payload, signed] = value.split('.'); if (!payload || !signed || !(await equal(signed, await signature(payload, env.SESSION_SECRET)))) return null;
  try { const session = JSON.parse(fromBase64Url(payload)); return session.expires > Date.now() && typeof session.username === 'string' ? { username: session.username } : null; } catch { return null; }
}

export function sessionCookie(value: string) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
