/**
 * "Sign in with Slack" (OpenID Connect).
 *
 * Flow:
 *   1. buildAuthorizeUrl() → redirect the user to Slack
 *   2. Slack redirects back to /auth/slack/callback?code=...&state=...
 *   3. exchangeCode() trades the code for an id_token + user info
 *
 * Docs: https://api.slack.com/authentication/sign-in-with-slack
 */
import crypto from 'crypto';
import type { SessionUser } from './session';

const AUTHORIZE_URL = 'https://slack.com/openid/connect/authorize';
const TOKEN_URL = 'https://slack.com/api/openid.connect.token';
const USERINFO_URL = 'https://slack.com/api/openid.connect.userInfo';

const SCOPES = ['openid', 'profile', 'email'];

export function isConfigured(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

export function redirectUri(): string {
  // Prefer explicit base URL; fall back to Railway domain, then localhost.
  const base =
    (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.replace(/\/$/, '')) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) ||
    `http://localhost:${parseInt(process.env.PORT || '', 10) || 3000}`;
  return `${base}/auth/slack/callback`;
}

/** Random state token to defend against CSRF. */
export function newState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** PKCE pair — Slack requires PKCE when redirecting to non-https (e.g. localhost). */
export function newPkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(state: string, codeChallenge: string, teamId?: string | null): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: SCOPES.join(' '),
    client_id: process.env.SLACK_CLIENT_ID || '',
    state,
    redirect_uri: redirectUri(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  // Non-distributed apps must scope the sign-in to a specific workspace.
  if (teamId) params.set('team', teamId);
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

let cachedTeamId: string | null | undefined;

/** Resolve the workspace Team ID via auth.test (cached). Returns null if unavailable. */
export async function getTeamId(): Promise<string | null> {
  if (cachedTeamId !== undefined) return cachedTeamId;
  cachedTeamId = process.env.SLACK_TEAM_ID || null;
  if (cachedTeamId) return cachedTeamId;
  try {
    const resp = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN || ''}` },
    });
    const data = (await resp.json()) as { ok: boolean; team_id?: string };
    cachedTeamId = data.ok && data.team_id ? data.team_id : null;
  } catch (_) {
    cachedTeamId = null;
  }
  return cachedTeamId;
}

interface TokenResponse {
  ok: boolean;
  access_token?: string;
  id_token?: string;
  error?: string;
}

interface UserInfoResponse {
  ok: boolean;
  sub?: string;            // Slack user ID
  name?: string;
  'https://slack.com/user_id'?: string;
  error?: string;
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<SessionUser> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.SLACK_CLIENT_ID || '',
    client_secret: process.env.SLACK_CLIENT_SECRET || '',
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  const tokenResp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = (await tokenResp.json()) as TokenResponse;
  if (!token.ok || !token.access_token) {
    throw new Error(`Slack token exchange failed: ${token.error || 'unknown'}`);
  }

  const infoResp = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const info = (await infoResp.json()) as UserInfoResponse;
  if (!info.ok || !info.sub) {
    throw new Error(`Slack userinfo failed: ${info.error || 'unknown'}`);
  }

  const slackUserId = info['https://slack.com/user_id'] || info.sub;
  return { slackUserId, name: info.name || 'Unknown' };
}
