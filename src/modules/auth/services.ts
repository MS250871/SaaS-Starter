import { ParsedIdentifier } from './types';

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
