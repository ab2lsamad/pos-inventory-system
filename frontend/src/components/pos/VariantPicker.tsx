'use client';

import Modal from '@/components/ui/Modal';
import { getVariantAttributeMap } from '@/types/product';
import type { Product, ProductVariant } from '@/types/product';
import { toNumber } from '@/lib/money';

interface VariantPickerProps {
  product: Product | null;
  onClose: () => void;
  onSelect: (product: Product, variant: ProductVariant) => void;
}

const getActiveVariants = (product: Product) => product.variants.filter((v) => v.isActive);

export default function VariantPicker({ product, onClose, onSelect }: VariantPickerProps) {
  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      title={product ? `Choose Variant — ${product.name}` : 'Choose Variant'}
    >
      <div className="space-y-3">
        {product
          ? getActiveVariants(product).map((variant) => {
              const attrMap = getVariantAttributeMap(variant);
              const attrText = Object.entries(attrMap)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ');

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    onSelect(product, variant);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left transition hover:border-slate-200 hover:bg-indigo-50/40"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{variant.name}</p>
                    {attrText ? (
                      <p className="text-xs text-slate-500">{attrText}</p>
                    ) : null}
                    <p className="font-mono text-xs text-slate-400">{variant.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--text-primary)]">
                      {toNumber(variant.price).toFixed(2)}
                    </p>
                  </div>
                </button>
              );
            })
          : null}
      </div>
    </Modal>
  );
}
