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

/** Random state token to defend against CSRF. Store it in a short-lived cookie. */
export function newState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: SCOPES.join(' '),
    client_id: process.env.SLACK_CLIENT_ID || '',
    state,
    redirect_uri: redirectUri(),
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
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

export async function exchangeCode(code: string): Promise<SessionUser> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.SLACK_CLIENT_ID || '',
    client_secret: process.env.SLACK_CLIENT_SECRET || '',
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
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
