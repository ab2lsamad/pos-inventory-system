'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Barcode } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Switch from '@/components/ui/Switch';
import { z } from 'zod';
import { useAddVariant } from '@/hooks/products/useAddVariant';
import { useUpdateVariant } from '@/hooks/products/useUpdateVariant';
import { useGenerateBarcodes } from '@/hooks/products/useGenerateBarcodes';
import VariantGenerator, { type GeneratedVariant } from './VariantGenerator';
import type { Product, ProductVariant } from '@/types/product';

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

// Edit mode only allows price/cost/barcode (attributes are immutable post-create).
const editSchema = z.object({
  price: z.string().trim().regex(MONEY_RE, 'Must be a valid amount (e.g. 0.00)'),
  cost: z.string().trim().regex(MONEY_RE, 'Must be a valid amount (e.g. 0.00)'),
  barcode: z.string().trim().min(1, 'Barcode is required'),
  isActive: z.boolean(),
});
type EditFormData = z.infer<typeof editSchema>;

interface VariantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  variant: ProductVariant | null; // null = add mode
}

export default function VariantFormModal({
  isOpen,
  onClose,
  product,
  variant,
}: VariantFormModalProps) {
  return variant ? (
    <EditVariantModal
      isOpen={isOpen}
      onClose={onClose}
      productId={product.id}
      variant={variant}
    />
  ) : (
    <AddVariantsModal
      isOpen={isOpen}
      onClose={onClose}
      product={product}
    />
  );
}

// ─── Edit ────────────────────────────────────────────────────────────────────

function EditVariantModal({
  isOpen,
  onClose,
  productId,
  variant,
}: {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  variant: ProductVariant;
}) {
  const updateVariant = useUpdateVariant(productId);
  const generateBarcodes = useGenerateBarcodes();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      price: variant.price,
      cost: variant.cost,
      barcode: variant.barcode ?? '',
      isActive: variant.isActive,
    },
  });

  const isActive = useWatch({ control: form.control, name: 'isActive' });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        price: variant.price,
        cost: variant.cost,
        barcode: variant.barcode ?? '',
        isActive: variant.isActive,
      });
    }
  }, [isOpen, variant, form]);

  const submitHandler = form.handleSubmit(async (values) => {
    try {
      await updateVariant.mutateAsync({
        variantId: variant.id,
        payload: {
          price: values.price,
          cost: values.cost,
          barcode: values.barcode,
          isActive: values.isActive,
        },
      });
      toast.success('Variant updated');
      onClose();
    } catch {
      // hook surfaces the toast
    }
  });

  // The modal is portaled to <body>, but React's synthetic events still bubble
  // through the component tree — without stopPropagation the inner submit also
  // triggers the outer ProductForm's submit.
  const onSubmit = (e: React.BaseSyntheticEvent) => {
    e.stopPropagation();
    void submitHandler(e);
  };

  const handleGenerateBarcode = async () => {
    try {
      const [code] = await generateBarcodes.mutateAsync(1);
      if (code) form.setValue('barcode', code, { shouldValidate: true });
    } catch {
      // hook surfaces the toast
    }
  };

  const attributeChips = variant.attributeValues
    .map((av) => `${av.attributeValue.attribute.name}: ${av.attributeValue.value}`)
    .join(' • ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Variant"
      maxWidth="max-w-lg"
      formId="variant-edit-form"
      onCancel={onClose}
      isLoading={updateVariant.isPending}
      confirmLabel="Update Variant"
    >
      <form id="variant-edit-form" onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-glass)] bg-slate-50/70 p-3 text-xs text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">{variant.name}</p>
          {attributeChips ? <p className="mt-1">{attributeChips}</p> : null}
          <p className="mt-1 font-mono">SKU: {variant.sku}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField<EditFormData>
            name="price"
            control={form.control}
            label="Price"
            placeholder="0.00"
          />
          <FormField<EditFormData>
            name="cost"
            control={form.control}
            label="Cost"
            placeholder="0.00"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField<EditFormData>
              name="barcode"
              control={form.control}
              label="Barcode"
              placeholder="Generate to set"
              readOnly
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            title="Auto-generate barcode"
            isLoading={generateBarcodes.isPending}
            onClick={() => void handleGenerateBarcode()}
          >
            <Barcode size={14} />
            Generate
          </Button>
        </div>

        <Switch
          label="Active"
          checked={isActive}
          onChange={(checked) => form.setValue('isActive', checked)}
        />
      </form>
    </Modal>
  );
}

// ─── Add (one or more new variants) ──────────────────────────────────────────

function AddVariantsModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}) {
  const addVariant = useAddVariant(product.id);
  const updateVariant = useUpdateVariant(product.id);
  const [rows, setRows] = useState<GeneratedVariant[]>([]);
  const [errorByKey, setErrorByKey] = useState<Record<string, { price?: string; cost?: string; barcode?: string }>>({});
  const [rootError, setRootError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Reset the draft rows each time the modal transitions to open. Done during
  // render (not in an effect) to avoid the cascading re-render an effect causes.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setRows([]);
      setErrorByKey({});
      setRootError(undefined);
    }
  }

  const existingCombos = useMemo(
    () =>
      product.variants.map((v) => ({
        id: v.id,
        attributeValueIds: v.attributeValues.map((av) => av.attributeValue.id),
      })),
    [product.variants],
  );

  const validate = (): boolean => {
    if (rows.length === 0) {
      setRootError('Generate at least one variant');
      return false;
    }
    const errs: Record<string, { price?: string; cost?: string; barcode?: string }> = {};
    rows.forEach((r) => {
      const rowErr: { price?: string; cost?: string; barcode?: string } = {};
      if (!MONEY_RE.test(r.price)) rowErr.price = 'Must be a valid amount (e.g. 0.00)';
      if (!MONEY_RE.test(r.cost)) rowErr.cost = 'Must be a valid amount (e.g. 0.00)';
      if (!r.barcode.trim()) rowErr.barcode = 'Barcode is required';
      if (Object.keys(rowErr).length > 0) errs[r.key] = rowErr;
    });
    setErrorByKey(errs);
    if (Object.keys(errs).length > 0) {
      setRootError('Fix the highlighted variants before saving');
      return false;
    }
    setRootError(undefined);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        if (row.existingVariantId) {
          await updateVariant.mutateAsync({
            variantId: row.existingVariantId,
            payload: {
              price: row.price,
              cost: row.cost,
              barcode: row.barcode,
              attributeValueIds: row.attributeValueIds,
              isActive: true,
            },
          });
          updated += 1;
        } else {
          await addVariant.mutateAsync({
            price: row.price,
            cost: row.cost,
            barcode: row.barcode,
            attributeValueIds: row.attributeValueIds,
          });
          created += 1;
        }
      } catch {
        failed += 1;
      }
    }
    setSaving(false);
    if (created > 0) toast.success(`Added ${created} variant${created === 1 ? '' : 's'}`);
    if (updated > 0) toast.success(`Updated ${updated} existing variant${updated === 1 ? '' : 's'}`);
    if (failed > 0) {
      toast.error(`${failed} variant${failed === 1 ? '' : 's'} failed — see error above`);
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Variants"
      maxWidth="max-w-2xl"
      onCancel={onClose}
      onConfirm={handleSave}
      confirmType="button"
      isLoading={saving}
      confirmLabel="Save Variants"
    >
      <VariantGenerator
        value={rows}
        onChange={setRows}
        existingCombos={existingCombos}
        errorByKey={errorByKey}
        rootError={rootError}
        defaultCollapsed
      />
    </Modal>
  );
}
