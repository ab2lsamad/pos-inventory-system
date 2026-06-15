'use client';

import { useState } from 'react';
import { Edit, Plus, PowerOff, Printer } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import VariantFormModal from './VariantFormModal';
import { useDeactivateVariant } from '@/hooks/products/useDeactivateVariant';
import { useCurrency } from '@/hooks/shared/useCurrency';
import { getVariantAttributeMap } from '@/types/product';
import type { Product, ProductVariant } from '@/types/product';
import { printBarcodeLabels, type BarcodeLabel } from '@/lib/print-barcode-label';
import toast from 'react-hot-toast';

interface VariantsPanelProps {
  product: Product;
  readOnly?: boolean;
}

export default function VariantsPanel({ product, readOnly = false }: VariantsPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const deactivate = useDeactivateVariant(product.id);
  const currency = useCurrency();

  const openAdd = () => {
    setEditingVariant(null);
    setIsFormOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setIsFormOpen(true);
  };

  const handleDeactivate = async (variant: ProductVariant) => {
    if (!variant.isActive) return;
    try {
      await deactivate.mutateAsync(variant.id);
      toast.success('Variant deactivated');
    } catch {
      // error handled by hook
    }
  };

  const toLabel = (variant: ProductVariant): BarcodeLabel => ({
    barcode: variant.barcode ?? '',
    productName: product.name,
    variantName: variant.name,
    price: variant.price,
    sku: variant.sku,
    currency,
  });

  const printOne = (variant: ProductVariant) => {
    if (!variant.barcode) {
      toast.error('This variant has no barcode to print');
      return;
    }
    if (!printBarcodeLabels([toLabel(variant)]))
      toast.error('Could not open the print window — check pop-up settings');
  };

  const printAll = () => {
    const labels = product.variants
      .filter((v) => v.isActive && v.barcode)
      .map(toLabel);
    if (labels.length === 0) {
      toast.error('No active variants with barcodes to print');
      return;
    }
    if (!printBarcodeLabels(labels))
      toast.error('Could not open the print window — check pop-up settings');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Variants ({product.variants.length})
        </p>
        <div className="flex gap-2">
          {readOnly ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={printAll}
              disabled={product.variants.length === 0}
            >
              <Printer size={14} />
              Print all
            </Button>
          ) : (
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} />
              Add Variant
            </Button>
          )}
        </div>
      </div>

      {product.variants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-glass)] bg-white/60 p-6 text-center text-sm text-[var(--text-muted)]">
          No variants yet. Add the first one above.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border-glass)] rounded-2xl border border-[var(--border-glass)] bg-white/60">
          {product.variants.map((variant) => {
            const attrMap = getVariantAttributeMap(variant);
            const attrEntries = Object.entries(attrMap);

            return (
              <div key={variant.id} className="group flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {variant.name}
                    </span>
                    {attrEntries.map(([attrName, value]) => (
                      <Badge key={attrName} variant="info">
                        {attrName}: {value}
                      </Badge>
                    ))}
                    {!variant.isActive && <Badge variant="danger">Inactive</Badge>}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-[var(--text-muted)]">
                    <span>SKU: {variant.sku}</span>
                    {variant.barcode ? <span>Barcode: {variant.barcode}</span> : null}
                    <span>Price: {variant.price}</span>
                    <span>Cost: {variant.cost}</span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {readOnly ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 !p-0"
                      title="Print barcode sticker"
                      onClick={() => printOne(variant)}
                    >
                      <Printer size={14} className="text-slate-400 hover:text-indigo-500" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 !p-0"
                        title="Edit variant"
                        onClick={() => openEdit(variant)}
                      >
                        <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
                      </Button>
                      {variant.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 !p-0 hover:bg-rose-50"
                          title="Deactivate variant"
                          isLoading={deactivate.isPending}
                          onClick={() => void handleDeactivate(variant)}
                        >
                          <PowerOff size={14} className="text-slate-400 hover:text-rose-500" />
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {readOnly ? null : (
        <VariantFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          product={product}
          variant={editingVariant}
        />
      )}
    </div>
  );
}
