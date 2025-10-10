import crypto from 'crypto';
import { config } from '../config';

export function signPayload(payload: object): { data: string; hash: string } {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', config.qrHmacSecret);
  hmac.update(data);
  const hash = hmac.digest('hex');
  return { data, hash };
}

export function verifyPayload(data: string, hash: string): any | null {
  const hmac = crypto.createHmac('sha256', config.qrHmacSecret);
  hmac.update(data);
  const expected = hmac.digest('hex');
  if (expected !== hash) return null;
  try {
    const json = Buffer.from(data, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}