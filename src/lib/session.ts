/**
 * Minimal signed-cookie session.
 *
 * The cookie payload is a base64url JSON blob with an HMAC-SHA256 signature:
 *   <base64url(payload)>.<base64url(hmac)>
 * Signed with SESSION_SECRET so the client can't forge a Slack identity.
 */
import crypto from 'crypto';

const COOKIE_NAME = 'bb_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  slackUserId: string;
  name: string;
}

function secret(): string {
  return process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str: string): Buffer {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload: string): string {
  return b64url(crypto.createHmac('sha256', secret()).update(payload).digest());
}

export function encodeSession(user: SessionUser): string {
  const payload = b64url(Buffer.from(JSON.stringify(user), 'utf8'));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  // Constant-time compare
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const obj = JSON.parse(fromB64url(payload).toString('utf8'));
    if (obj && typeof obj.slackUserId === 'string') return obj as SessionUser;
  } catch (_) { /* fall through */ }
  return null;
}

/** Parse our session cookie out of a raw Cookie header. */
export function readSession(cookieHeader: string | undefined): SessionUser | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    if (key === COOKIE_NAME) {
      return decodeSession(decodeURIComponent(pair.slice(idx + 1).trim()));
    }
  }
  return null;
}

export function buildSetCookie(user: SessionUser, secure: boolean): string {
  const value = encodeURIComponent(encodeSession(user));
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
