import { BadRequestException } from '@nestjs/common';

/**
 * Canonical date-range handling for analytics/report endpoints.
 *
 * Date-only strings ("2026-06-02") are interpreted as full UTC days so a range
 * is inclusive of both boundary days regardless of the caller's timezone. Full
 * ISO timestamps are passed through untouched. This mirrors the boundary logic
 * originally private to CompensationService.
 */

export const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseBoundaryDate(
  value: string,
  boundary: 'start' | 'end',
): Date {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return boundary === 'start'
      ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new BadRequestException(`Invalid ${boundary} date`);
  return parsed;
}

/** End-of-today in UTC — the latest selectable boundary (no future dates). */
function endOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

/**
 * Resolves an optional start/end pair into concrete UTC boundaries, defaulting
 * to the last {@link DEFAULT_RANGE_DAYS} days (inclusive of today) when either
 * side is missing. Validates ordering, rejects future end dates, and caps the
 * span at {@link MAX_RANGE_DAYS} to bound query cost as data grows.
 */
export function resolveDateRange(
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const end = endDate ? parseBoundaryDate(endDate, 'end') : endOfTodayUtc();

  let start: Date;
  if (startDate) {
    start = parseBoundaryDate(startDate, 'start');
  } else {
    const base = new Date(end.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);
    start = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  assertRange(start, end);
  return { start, end };
}

export function assertRange(start: Date, end: Date): void {
  if (end < start)
    throw new BadRequestException('endDate must be on or after startDate');

  if (end.getTime() > endOfTodayUtc().getTime() + 1)
    throw new BadRequestException('endDate cannot be in the future');

  const spanDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (spanDays > MAX_RANGE_DAYS)
    throw new BadRequestException(
      `Date range too large (max ${MAX_RANGE_DAYS} days). Narrow the range.`,
    );
}
