import { randomInt } from 'crypto';

/**
 * Compute the EAN-13 mod-10 check digit for the first 12 digits.
 * `digits12` must be exactly 12 numeric characters.
 */
export const eanCheckDigit = (digits12: string): string => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = digits12.charCodeAt(i) - 48; // '0' === 48
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return String(check);
};

/**
 * Generate a random, valid EAN-13 barcode (13 numeric digits, last is the
 * check digit). Uniqueness against existing variants is enforced by the caller.
 */
export const randomEan13 = (): string => {
  let body = '';
  for (let i = 0; i < 12; i++) body += randomInt(0, 10).toString();
  return body + eanCheckDigit(body);
};
