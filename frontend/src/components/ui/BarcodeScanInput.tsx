'use client';

import { useRef } from 'react';
import { ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import { useProductByBarcode } from '@/hooks/pos/usePosProductSearch';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Product, ProductVariant } from '@/types/product';

export interface BarcodeScanResult {
  product: Product;
  variant: ProductVariant;
}

interface BarcodeScanInputProps {
  /**
   * Called once a scanned barcode resolves to a variant. Return a string to
   * reject the scan (shown as an error toast — e.g. "already added" / "out of
   * stock"); return nothing to accept it.
   */
  onScan: (
    result: BarcodeScanResult,
  ) => string | void | Promise<string | void>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  id?: string;
  /** Forwarded to the underlying input — e.g. to keep a scanner gun focused. */
  ref?: React.Ref<HTMLInputElement>;
  /**
   * Optional local product list to match against before hitting the API — lets
   * the common case (a product already on screen) resolve instantly, mirroring
   * the POS terminal.
   */
  products?: Product[];
  /** Verb used in the success toast, e.g. "Added" (cart) or "Selected" (field). */
  successVerb?: string;
}

export default function BarcodeScanInput({
  onScan,
  label,
  placeholder = 'Scan barcode…',
  disabled = false,
  autoFocus = false,
  className,
  id,
  ref,
  products,
  successVerb = 'Added',
}: BarcodeScanInputProps) {
  const fetchProductByBarcode = useProductByBarcode();
  const showError = useErrorToast();
  const busyRef = useRef(false);

  const resolve = async (barcode: string): Promise<BarcodeScanResult> => {
    const local = (products ?? []).find((p) =>
      p.variants.some((v) => v.isActive && v.barcode === barcode),
    );
    if (local) {
      const variant = local.variants.find(
        (v) => v.isActive && v.barcode === barcode,
      );
      if (variant) return { product: local, variant };
    }
    const { product, matchedVariant } = await fetchProductByBarcode(barcode);
    return { product, variant: matchedVariant };
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // A scanner gun emits a trailing Enter; swallow it so it never submits the
    // surrounding form (the whole point — the form must not save on a scan).
    e.preventDefault();
    e.stopPropagation();

    const input = e.currentTarget;
    const barcode = input.value.trim();
    if (!barcode || busyRef.current) return;
    input.value = '';

    busyRef.current = true;
    try {
      const result = await resolve(barcode);
      const rejection = await onScan(result);
      if (rejection) {
        toast.error(rejection);
      } else {
        toast.success(
          `${successVerb} ${result.product.name} — ${result.variant.name}`,
        );
      }
    } catch (error: unknown) {
      showError(error, 'Product not found');
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <Input
      ref={ref}
      label={label}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      icon={<ScanLine size={16} />}
      disabled={disabled}
      autoFocus={autoFocus}
      id={id}
      className={className}
    />
  );
}
