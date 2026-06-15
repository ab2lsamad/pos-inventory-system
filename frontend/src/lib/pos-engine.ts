import { add, mul, pct, sub } from './money';
import { DiscountType } from '@/types/shared';
import type { CartLine, CartLineDiscount } from '@/types/pos';

function applyDiscount(base: string, discount: CartLineDiscount): string {
  if (discount.type === DiscountType.PERCENTAGE) {
    return pct(base, discount.value);
  }
  const fixed = parseFloat(discount.value);
  const baseNum = parseFloat(base);
  return fixed >= baseNum ? base : discount.value;
}

function sumDiscounts(lineGross: string, discounts: CartLineDiscount[]): string {
  let total = '0';
  for (const d of discounts) {
    total = add(total, applyDiscount(lineGross, d));
  }
  const gross = parseFloat(lineGross);
  const totalNum = parseFloat(total);
  return totalNum > gross ? lineGross : total;
}

export function recomputeLine(line: Omit<CartLine, 'runningTotals'>): CartLine {
  const lineGross = mul(line.unitPrice, line.quantity);
  const lineDiscount = sumDiscounts(lineGross, line.discounts);
  const taxable = sub(lineGross, lineDiscount);
  const lineTax = line.taxRatePercent !== '0' ? pct(taxable, line.taxRatePercent) : '0.00';
  const lineNet = add(taxable, lineTax);
  return {
    ...line,
    runningTotals: { lineGross, lineDiscount, lineTax, lineNet },
  };
}

// Order-level discounts are kept at the footer, not prorated into line totals.
// Each line's `lineNet` stays pure (gross − line discount + tax), matching what
// the backend persists per OrderItem; the order discount only reduces the grand
// total (see computeGrandTotal). This mirrors the checkout payload, which sends
// the order discount as a separate order-level field rather than per line.
export function recomputeTotals(
  lines: Omit<CartLine, 'runningTotals'>[],
): CartLine[] {
  return lines.map(recomputeLine);
}

export function computeGrandTotal(
  lines: CartLine[],
  orderDiscounts: CartLineDiscount[] = [],
): string {
  const linesNet = lines.reduce((sum, l) => add(sum, l.runningTotals.lineNet), '0');
  if (orderDiscounts.length === 0) return linesNet;
  // Use the same sequential capping as the checkout payload so the displayed
  // grand total equals the sum actually sent to the backend.
  const orderDiscountTotal = splitDiscountAmounts(linesNet, orderDiscounts).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  return sub(linesNet, orderDiscountTotal.toFixed(2));
}

export function computeChangeDue(grandTotal: string, amountPaid: string): string {
  const change = sub(amountPaid, grandTotal);
  return parseFloat(change) < 0 ? '0.00' : change;
}

// Split a list of discounts into the absolute amount each one actually
// contributes against `base`, mirroring the engine: every entry is computed
// against the original base, then sequentially capped so the cumulative total
// never exceeds the base.
export function splitDiscountAmounts(
  base: string,
  discounts: CartLineDiscount[],
): number[] {
  const baseNum = parseFloat(base);
  let remaining = baseNum;
  return discounts.map((d) => {
    if (remaining <= 0) return 0;
    const computed = parseFloat(applyDiscount(base, d));
    const applied = Math.min(computed, remaining);
    remaining -= applied;
    return +applied.toFixed(2);
  });
}
