'use client';

import { useCallback, useMemo, useState } from 'react';
import { getVariantAttributeMap } from '@/types/product';
import { recomputeTotals, computeGrandTotal } from '@/lib/pos-engine';
import type { CartLine, CartLineDiscount } from '@/types/pos';
import type { Product, ProductVariant } from '@/types/product';
import type { Discount } from '@/types/discount';
import { DiscountScope } from '@/types/shared';

type CartLineBase = Omit<CartLine, 'runningTotals'>;

interface AddLineArgs {
  product: Product;
  variant: ProductVariant;
  quantity?: number;
}

interface UseCartOptions {
  // Catalog discounts that the caller deems eligible (active, within window,
  // usage available). Items with scope LINE_ITEM are auto-applied to every
  // line; ORDER-scoped items are auto-applied to the order. Manual discounts
  // added through the UI stack on top, deduped by discountId.
  autoApplyDiscounts?: Discount[];
}

function buildLine(product: Product, variant: ProductVariant, quantity: number): CartLineBase {
  const attrMap = getVariantAttributeMap(variant);
  return {
    variantId: variant.id,
    productName: product.name,
    variantName: variant.name,
    sku: variant.sku,
    attributeChips: Object.entries(attrMap).map(([attributeName, value]) => ({
      attributeName,
      value,
    })),
    quantity,
    unitPrice: variant.price,
    discounts: [],
    taxRatePercent: product.taxRate?.rate ?? '0',
  };
}

function toCartLineDiscount(d: Discount): CartLineDiscount {
  return { discountId: d.id, name: d.name, type: d.type, value: d.value };
}

function dedupeByDiscountId(list: CartLineDiscount[]): CartLineDiscount[] {
  const seen = new Set<string>();
  const out: CartLineDiscount[] = [];
  for (const d of list) {
    if (d.discountId) {
      if (seen.has(d.discountId)) continue;
      seen.add(d.discountId);
    }
    out.push(d);
  }
  return out;
}

export function useCart({ autoApplyDiscounts = [] }: UseCartOptions = {}) {
  const [lines, setLines] = useState<CartLineBase[]>([]);
  const [orderDiscounts, setOrderDiscounts] = useState<CartLineDiscount[]>([]);
  const [suppressedAutoIds, setSuppressedAutoIds] = useState<Set<string>>(() => new Set());

  const addLine = useCallback(({ product, variant, quantity = 1 }: AddLineArgs) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.variantId === variant.id);
      if (idx !== -1) {
        return prev.map((l, i) =>
          i === idx ? { ...l, quantity: l.quantity + quantity } : l,
        );
      }
      return [...prev, buildLine(product, variant, quantity)];
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.variantId === variantId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const updateLineDiscounts = useCallback(
    (variantId: string, discounts: CartLineDiscount[]) => {
      setLines((prev) =>
        prev.map((l) => (l.variantId === variantId ? { ...l, discounts } : l)),
      );
    },
    [],
  );

  const removeItem = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setOrderDiscounts([]);
    setSuppressedAutoIds(new Set());
  }, []);

  const suppressAutoDiscount = useCallback((discountId: string) => {
    setSuppressedAutoIds((prev) => {
      if (prev.has(discountId)) return prev;
      const next = new Set(prev);
      next.add(discountId);
      return next;
    });
  }, []);

  const restoreAutoDiscount = useCallback((discountId: string) => {
    setSuppressedAutoIds((prev) => {
      if (!prev.has(discountId)) return prev;
      const next = new Set(prev);
      next.delete(discountId);
      return next;
    });
  }, []);

  const addOrderDiscount = useCallback((discount: CartLineDiscount) => {
    setOrderDiscounts((prev) => [...prev, discount]);
  }, []);

  const removeOrderDiscount = useCallback((index: number) => {
    setOrderDiscounts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearOrderDiscounts = useCallback(() => setOrderDiscounts([]), []);

  // Split eligible catalog discounts by scope.
  const autoLineDiscounts = useMemo<CartLineDiscount[]>(
    () =>
      autoApplyDiscounts
        .filter((d) => d.scope === DiscountScope.LINE_ITEM && !suppressedAutoIds.has(d.id))
        .map(toCartLineDiscount),
    [autoApplyDiscounts, suppressedAutoIds],
  );
  const autoOrderDiscounts = useMemo<CartLineDiscount[]>(
    () =>
      autoApplyDiscounts
        .filter((d) => d.scope === DiscountScope.ORDER && !suppressedAutoIds.has(d.id))
        .map(toCartLineDiscount),
    [autoApplyDiscounts, suppressedAutoIds],
  );

  // Variant-targeting for auto line discounts: discountId → allowed variant
  // IDs. Only discounts WITH a non-empty target set appear here; absence means
  // the discount is unrestricted and auto-applies to every line (legacy
  // behavior). Targeted discounts only auto-apply to matching variants.
  const autoLineTargetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const d of autoApplyDiscounts) {
      if (d.scope !== DiscountScope.LINE_ITEM || suppressedAutoIds.has(d.id)) continue;
      const targets = d.targetVariants ?? [];
      if (targets.length > 0) {
        map.set(d.id, new Set(targets.map((t) => t.variantId)));
      }
    }
    return map;
  }, [autoApplyDiscounts, suppressedAutoIds]);

  const autoLineDiscountsFor = useCallback(
    (variantId: string) =>
      autoLineDiscounts.filter((d) => {
        const targets = d.discountId ? autoLineTargetMap.get(d.discountId) : undefined;
        return !targets || targets.has(variantId);
      }),
    [autoLineDiscounts, autoLineTargetMap],
  );

  // Auto entries take precedence in the dedup so manual duplicates are dropped.
  const mergedLines = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        discounts: dedupeByDiscountId([...autoLineDiscountsFor(l.variantId), ...l.discounts]),
      })),
    [lines, autoLineDiscountsFor],
  );

  const effectiveOrderDiscounts = useMemo(
    () => dedupeByDiscountId([...autoOrderDiscounts, ...orderDiscounts]),
    [autoOrderDiscounts, orderDiscounts],
  );

  // Reflects discounts actually auto-applied to at least one current line (a
  // targeted line discount with no matching variant in the cart counts as not
  // applied), plus all auto order discounts.
  const autoAppliedIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of lines)
      for (const d of autoLineDiscountsFor(l.variantId))
        if (d.discountId) s.add(d.discountId);
    for (const d of autoOrderDiscounts) if (d.discountId) s.add(d.discountId);
    return s;
  }, [lines, autoLineDiscountsFor, autoOrderDiscounts]);

  const items = useMemo<CartLine[]>(() => recomputeTotals(mergedLines), [mergedLines]);

  const grandTotal = useMemo(
    () => computeGrandTotal(items, effectiveOrderDiscounts),
    [items, effectiveOrderDiscounts],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  return {
    items,
    addLine,
    updateQuantity,
    updateLineDiscounts,
    removeItem,
    clear,
    orderDiscounts,
    effectiveOrderDiscounts,
    autoAppliedIds,
    suppressedAutoIds,
    suppressAutoDiscount,
    restoreAutoDiscount,
    addOrderDiscount,
    removeOrderDiscount,
    clearOrderDiscounts,
    grandTotal,
    itemCount,
  };
}

export type UseCartReturn = ReturnType<typeof useCart>;
