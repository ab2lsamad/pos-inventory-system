// Money helpers. All amounts on the wire are Decimal strings.
// Keep money as strings in form state and parse only at display/arithmetic time.

const MONEY_REGEX = /^-?\d+(\.\d{1,})?$/;

function assertMoney(value: string): void {
  if (!MONEY_REGEX.test(value)) {
    throw new Error(`Invalid money string: ${value}`);
  }
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const HUNDRED = BigInt(100);
const ZERO = BigInt(0);

function toCents(value: string): bigint {
  assertMoney(value);
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, frac = ''] = unsigned.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const cents = BigInt(whole) * HUNDRED + BigInt(fracPadded || '0');
  return negative ? -cents : cents;
}

function fromCents(cents: bigint): string {
  const negative = cents < ZERO;
  const abs = negative ? -cents : cents;
  const whole = abs / HUNDRED;
  const frac = abs % HUNDRED;
  const fracStr = frac.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fracStr}`;
}

export function add(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

export function sub(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

export function mul(value: string, factor: number): string {
  const cents = toCents(value);
  // Multiply via Number then round to cents to avoid bigint*float issues.
  const product = Math.round(Number(cents) * factor);
  return fromCents(BigInt(product));
}

// Returns `value * (percent / 100)` rounded to cents.
export function pct(value: string, percent: string | number): string {
  const p = typeof percent === 'number' ? percent : toNumber(percent);
  return mul(value, p / 100);
}

const CURRENCY_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  const key = currency.toUpperCase();
  let formatter = CURRENCY_FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: key,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    CURRENCY_FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

export function format(currency: string, value: string | number): string {
  return getFormatter(currency).format(toNumber(value));
}
