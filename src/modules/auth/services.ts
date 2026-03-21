import { ParsedIdentifier } from './types';
import { RequestContext } from '@/lib/context/request-context';
import crypto from 'crypto';

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^[0-9]{10,15}$/;

export function parseIdentifier(identifier: string): ParsedIdentifier | null {
  const value = identifier.trim().toLowerCase();

  if (emailRegex.test(value)) {
    return { type: 'email', value };
  }

  if (phoneRegex.test(value)) {
    return { type: 'phone', value };
  }

  return null;
}

export function createFingerprint(ctx: RequestContext) {
  const raw = `${ctx.browser}-${ctx.os}-${ctx.device}-${ctx.userAgent}`;

  return crypto.createHash('sha256').update(raw).digest('hex');
}
