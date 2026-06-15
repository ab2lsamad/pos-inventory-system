import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export const toDecimal = (value: DecimalLike): Prisma.Decimal => {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  return new Decimal(value);
};

export const toNumber = (value: DecimalLike): number => {
  if (value === null || value === undefined) return 0;
  if (value instanceof Decimal) return value.toNumber();
  return new Decimal(value).toNumber();
};

export const toMoneyString = (value: DecimalLike, places = 2): string =>
  toDecimal(value).toFixed(places);

export const sumDecimals = (...values: DecimalLike[]): Prisma.Decimal =>
  values.reduce<Prisma.Decimal>(
    (acc, v) => acc.add(toDecimal(v)),
    new Decimal(0),
  );

export const multiplyDecimals = (...values: DecimalLike[]): Prisma.Decimal =>
  values.reduce<Prisma.Decimal>(
    (acc, v) => acc.mul(toDecimal(v)),
    new Decimal(1),
  );

export const percentOf = (
  amount: DecimalLike,
  percent: DecimalLike,
): Prisma.Decimal => toDecimal(amount).mul(toDecimal(percent)).div(100);
