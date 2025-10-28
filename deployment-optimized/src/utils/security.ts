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

// Generate user-friendly voucher code (format: 5dd5-7dyy-7636)
export function generateFriendlyVoucherCode(payload: object): string {
  // Create a hash of the payload for uniqueness
  const payloadStr = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(payloadStr + config.qrHmacSecret).digest('hex');
  
  // Use first 12 characters of hash and format as xxxx-xxxx-xxxx
  const code = hash.substring(0, 12);
  return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
}

// Verify user-friendly voucher code and return payload
export function verifyFriendlyVoucherCode(code: string, payload: object): boolean {
  try {
    // Remove dashes and normalize
    const normalizedCode = code.replace(/-/g, '').toLowerCase();
    if (normalizedCode.length !== 12) return false;
    
    // Generate expected code for this payload
    const expectedCode = generateFriendlyVoucherCode(payload);
    const expectedNormalized = expectedCode.replace(/-/g, '').toLowerCase();
    
    return normalizedCode === expectedNormalized;
  } catch (e) {
    return false;
  }
}

// Enhanced payload signing that includes friendly code
export function signPayloadWithFriendlyCode(payload: object): { data: string; hash: string; friendlyCode: string } {
  const result = signPayload(payload);
  const friendlyCode = generateFriendlyVoucherCode(payload);
  return { ...result, friendlyCode };
}