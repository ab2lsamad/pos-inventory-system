import { toNumber } from './money';
import type { ProductVariant } from '@/types/product';

export function getPriceSummary(variants: Pick<ProductVariant, 'price'>[]): string {
  if (!variants.length) return '-';
  const prices = variants.map((v) => toNumber(v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const fmt = (n: number) => n.toFixed(2);
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function getCostSummary(variants: Pick<ProductVariant, 'cost'>[]): string {
  if (!variants.length) return '-';
  const costs = variants.map((v) => toNumber(v.cost));
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  const fmt = (n: number) => n.toFixed(2);
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function composeVariantName(values: { attributeName: string; value: string }[]): string {
  return values.map((v) => v.value).join(' / ');
}
