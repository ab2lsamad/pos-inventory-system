'use client';

import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getPriceSummary, getCostSummary } from '@/lib/product-form';
import { printBarcodeLabels } from '@/lib/print-barcode-label';
import { useCurrency } from '@/hooks/shared/useCurrency';
import VariantsPanel from './VariantsPanel';
import { ProductType } from '@/types/shared';
import type { Product } from '@/types/product';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const currency = useCurrency();
  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      title={product ? `${product.name}` : 'Product Details'}
      maxWidth="max-w-3xl"
    >
      {product ? (
        <div className="space-y-5">
          {/* Meta row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-glass)] bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SKU</p>
              <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-primary)]">
                {product.sku}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-glass)] bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Type</p>
              <div className="mt-1">
                <Badge variant={product.type === ProductType.VARIABLE ? 'info' : 'default'}>
                  {product.type === ProductType.VARIABLE ? 'Variable' : 'Simple'}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-glass)] bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Category</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {product.category?.name ?? '—'}
              </p>
              {product.brand ? (
                <p className="text-xs text-slate-400">{product.brand.name}</p>
              ) : null}
            </div>
          </div>

          {/* Description */}
          {product.description ? (
            <div className="rounded-2xl border border-[var(--border-glass)] bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Description
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{product.description}</p>
            </div>
          ) : null}

          {/* SIMPLE variant — flat display */}
          {product.type === ProductType.SIMPLE && product.variants[0] ? (
            <div className="rounded-2xl border border-[var(--border-glass)] bg-white/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Variant
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const v = product.variants[0];
                    if (!v.barcode) {
                      toast.error('This product has no barcode to print');
                      return;
                    }
                    if (
                      !printBarcodeLabels([
                        {
                          barcode: v.barcode,
                          productName: product.name,
                          price: v.price,
                          sku: v.sku,
                          currency,
                        },
                      ])
                    )
                      toast.error(
                        'Could not open the print window — check pop-up settings',
                      );
                  }}
                >
                  <Printer size={14} />
                  Print sticker
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-400">SKU</p>
                  <p className="font-mono font-semibold text-[var(--text-primary)]">
                    {product.variants[0].sku}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {product.variants[0].price}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Cost</p>
                  <p className="text-[var(--text-secondary)]">{product.variants[0].cost}</p>
                </div>
                {product.variants[0].barcode ? (
                  <div>
                    <p className="text-xs text-slate-400">Barcode</p>
                    <p className="font-mono text-[var(--text-secondary)]">
                      {product.variants[0].barcode}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <Badge variant={product.variants[0].isActive ? 'success' : 'danger'}>
                    {product.variants[0].isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}

          {/* VARIABLE — price summary + VariantsPanel */}
          {product.type === ProductType.VARIABLE ? (
            <>
              <div className="flex gap-6 text-sm">
                <span className="text-[var(--text-muted)]">
                  Price range:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {getPriceSummary(product.variants)}
                  </strong>
                </span>
                <span className="text-[var(--text-muted)]">
                  Cost range:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {getCostSummary(product.variants)}
                  </strong>
                </span>
              </div>
              <VariantsPanel product={product} readOnly />
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
