/**
 * File-based store for banner approval requests.
 * Each request → assets/pending/<id>.json + assets/pending/<id>.png.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PendingRequest, BannerParams } from '../types';

const PENDING_DIR = path.resolve(__dirname, '../../assets/pending');
if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });

function newId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function jsonPath(id: string): string {
  return path.join(PENDING_DIR, `${id}.json`);
}

export function pngPath(id: string): string {
  return path.join(PENDING_DIR, `${id}.png`);
}

export interface SaveArgs {
  requester: string;
  slackUserId: string;
  templateId: string;
  params: BannerParams;
  pngBuffer: Buffer;
}

export function saveRequest({ requester, slackUserId, templateId, params, pngBuffer }: SaveArgs): PendingRequest {
  const id = newId();
  fs.writeFileSync(pngPath(id), pngBuffer);
  const record: PendingRequest = {
    id,
    requester: String(requester || '').trim(),
    slackUserId: String(slackUserId || '').trim(),
    templateId,
    params,
    pngFile: `${id}.png`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(jsonPath(id), JSON.stringify(record, null, 2));
  return record;
}

export function loadRequest(id: string): PendingRequest | null {
  if (!/^[a-f0-9]{16}$/i.test(id)) return null;
  const p = jsonPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as PendingRequest;
}

export function updateRequest(id: string, patch: Partial<PendingRequest>): PendingRequest | null {
  const record = loadRequest(id);
  if (!record) return null;
  const next: PendingRequest = { ...record, ...patch, updatedAt: new Date().toISOString() };
  fs.writeFileSync(jsonPath(id), JSON.stringify(next, null, 2));
  return next;
}

export function listPending(): PendingRequest[] {
  return fs.readdirSync(PENDING_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), 'utf8')) as PendingRequest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export { PENDING_DIR };
