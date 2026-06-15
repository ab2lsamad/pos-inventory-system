'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Barcode, ChevronDown, ChevronUp, Trash2, Wand2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import SearchableSelect, {
  type SearchableSelectItem,
} from '@/components/ui/SearchableSelect';
import MultiSearchableSelect from '@/components/ui/MultiSearchableSelect';
import VariantsPanel from './VariantsPanel';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { productSchema, type ProductFormData } from '@/schemas/product';
import { useCreateProduct } from '@/hooks/products/useCreateProduct';
import { useUpdateProduct } from '@/hooks/products/useUpdateProduct';
import { useUpdateVariant } from '@/hooks/products/useUpdateVariant';
import { useGenerateBarcodes } from '@/hooks/products/useGenerateBarcodes';
import { ProductType } from '@/types/shared';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import type { Brand } from '@/types/brand';
import type { TaxRate } from '@/types/tax-rate';
import type { Attribute } from '@/types/attribute';
import type { PaginatedResponse } from '@/types/shared';

interface ProductFormProps {
  product: Product | null;
}

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function buildDefaultValues(product: Product | null): ProductFormData {
  if (!product) {
    return {
      name: '',
      description: '',
      type: ProductType.SIMPLE,
      categoryId: '',
      brandId: '',
      taxRateId: '',
      isActive: true,
      simpleVariant: { price: '', cost: '', barcode: '' },
      variants: undefined,
    };
  }
  const isSimple = product.type === ProductType.SIMPLE;
  const firstVariant = product.variants[0];
  return {
    name: product.name,
    description: product.description ?? '',
    type: product.type,
    categoryId: product.categoryId ?? '',
    brandId: product.brandId ?? '',
    taxRateId: product.taxRateId ?? '',
    isActive: product.isActive,
    simpleVariant:
      isSimple && firstVariant
        ? {
            price: firstVariant.price,
            cost: firstVariant.cost,
            barcode: firstVariant.barcode ?? '',
          }
        : undefined,
    variants: undefined,
  };
}

async function fetchAttributes(): Promise<Attribute[]> {
  const res = await api.get<Attribute[]>(API_ENDPOINTS.attributes.list(1, 200));
  return Array.isArray(res.data) ? res.data : [];
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateVariant = useUpdateVariant(product?.id ?? '');
  const generateBarcodes = useGenerateBarcodes();
  const saving =
    createProduct.isPending || updateProduct.isPending || updateVariant.isPending;
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: buildDefaultValues(product),
  });

  const productType = useWatch({ control: form.control, name: 'type' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });
  const isVariable = productType === ProductType.VARIABLE;

  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  // Keep simpleVariant / variants in sync when the user toggles type at create time.
  // (Edit mode disables the toggle entirely.)
  useEffect(() => {
    if (isEditing) return;
    if (isVariable) {
      form.setValue('simpleVariant', undefined, { shouldValidate: false });
    } else {
      form.setValue('simpleVariant', { price: '', cost: '', barcode: '' }, { shouldValidate: false });
      form.setValue('variants', undefined, { shouldValidate: false });
    }
  }, [isVariable, isEditing, form]);

  // Attribute / value selection state for the VARIABLE create generator.
  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes', 'all'],
    queryFn: fetchAttributes,
    staleTime: 60_000,
    enabled: isVariable && !isEditing,
  });

  const activeAttributes = useMemo(
    () =>
      attributes
        .filter((a) => a.isActive)
        .slice()
        .sort((a, b) => a.position - b.position),
    [attributes],
  );
  const attributeIndex = useMemo(() => {
    const map = new Map<string, Attribute>();
    for (const a of attributes) map.set(a.id, a);
    return map;
  }, [attributes]);
  const valueIndex = useMemo(() => {
    const map = new Map<string, { attribute: Attribute; valueLabel: string }>();
    for (const attr of attributes) {
      for (const v of attr.values) {
        map.set(v.id, { attribute: attr, valueLabel: v.value });
      }
    }
    return map;
  }, [attributes]);

  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [valueIdsByAttr, setValueIdsByAttr] = useState<Record<string, string[]>>({});
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchAttributeOptions = useCallback(
    async (search: string): Promise<SearchableSelectItem[]> => {
      const q = search.trim().toLowerCase();
      return activeAttributes
        .filter((a) => !q || a.name.toLowerCase().includes(q))
        .map((a) => ({ value: a.id, label: a.name }));
    },
    [activeAttributes],
  );

  const selectedAttributeItems: SearchableSelectItem[] = useMemo(
    () =>
      selectedAttributeIds
        .map((id) => attributeIndex.get(id))
        .filter((a): a is Attribute => !!a)
        .map((a) => ({ value: a.id, label: a.name })),
    [selectedAttributeIds, attributeIndex],
  );

  const handleAttributesChange = (ids: string[]) => {
    setSelectedAttributeIds(ids);
    setValueIdsByAttr((prev) => {
      const next: Record<string, string[]> = {};
      for (const id of ids) next[id] = prev[id] ?? [];
      return next;
    });
  };

  const fetchValueOptions = (attrId: string) =>
    async (search: string): Promise<SearchableSelectItem[]> => {
      const attr = attributeIndex.get(attrId);
      if (!attr) return [];
      const q = search.trim().toLowerCase();
      return attr.values
        .filter((v) => v.isActive)
        .filter((v) => !q || v.value.toLowerCase().includes(q))
        .sort((a, b) => a.position - b.position)
        .map((v) => ({ value: v.id, label: v.value }));
    };

  const generateVariations = () => {
    const groups: string[][] = selectedAttributeIds
      .map((id) => valueIdsByAttr[id] ?? [])
      .filter((g) => g.length > 0);
    if (groups.length === 0) {
      toast.error('Pick attribute values before generating');
      return;
    }
    const combos = groups.reduce<string[][]>(
      (acc, group) => acc.flatMap((c) => group.map((v) => [...c, v])),
      [[]],
    );
    const rows = combos.map((combo) => ({
      key: rowKey(),
      attributeValueIds: combo,
      price: bulkPrice,
      cost: bulkCost,
      barcode: '',
      isActive: true,
    }));
    replace(rows);
    setExpanded({});
  };

  const applyBulkToAll = () => {
    if (!bulkPrice && !bulkCost) {
      toast.error('Enter a bulk price or cost first');
      return;
    }
    fields.forEach((_, index) => {
      if (bulkPrice) form.setValue(`variants.${index}.price`, bulkPrice, { shouldValidate: true });
      if (bulkCost) form.setValue(`variants.${index}.cost`, bulkCost, { shouldValidate: true });
    });
    toast.success('Applied to all variants');
  };

  const generateSimpleBarcode = async () => {
    try {
      const [code] = await generateBarcodes.mutateAsync(1);
      if (code)
        form.setValue('simpleVariant.barcode', code, { shouldValidate: true });
    } catch {
      // hook surfaces the toast
    }
  };

  const generateAllBarcodes = async () => {
    if (fields.length === 0) {
      toast.error('Generate variations first');
      return;
    }
    try {
      const codes = await generateBarcodes.mutateAsync(fields.length);
      fields.forEach((_, index) => {
        if (codes[index])
          form.setValue(`variants.${index}.barcode`, codes[index], {
            shouldValidate: true,
          });
      });
      toast.success('Barcodes generated');
    } catch {
      // hook surfaces the toast
    }
  };

  const generateRowBarcode = async (index: number) => {
    try {
      const [code] = await generateBarcodes.mutateAsync(1);
      if (code)
        form.setValue(`variants.${index}.barcode`, code, {
          shouldValidate: true,
        });
    } catch {
      // hook surfaces the toast
    }
  };

  const variantTitle = (valueIds: string[] | undefined): string => {
    if (!valueIds || valueIds.length === 0) return 'Variant';
    const parts: string[] = [];
    for (const id of valueIds) {
      const entry = valueIndex.get(id);
      if (entry) parts.push(entry.valueLabel);
    }
    return parts.join(' / ') || 'Variant';
  };

  const fetchCategories = useCallback(async (search: string): Promise<SearchableSelectItem[]> => {
    const res = await api.get<PaginatedResponse<Category>>(
      API_ENDPOINTS.categories.list(1, 50, search ? { search } : undefined),
    );
    return (res.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  }, []);

  const fetchBrands = useCallback(async (search: string): Promise<SearchableSelectItem[]> => {
    const res = await api.get<PaginatedResponse<Brand>>(
      API_ENDPOINTS.brands.list(1, 50, search ? { search } : undefined),
    );
    return (res.data?.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  }, []);

  const fetchTaxRates = useCallback(async (search: string): Promise<SearchableSelectItem[]> => {
    const res = await api.get<PaginatedResponse<TaxRate>>(
      API_ENDPOINTS.taxRates.list(1, 50, search ? { search } : undefined),
    );
    return (res.data?.data ?? [])
      .filter((t) => t.isActive)
      .map((t) => ({ value: t.id, label: `${t.name} (${t.rate}%)` }));
  }, []);

  const selectedCategoryItem: SearchableSelectItem | null = product?.category
    ? { value: product.category.id, label: product.category.name }
    : null;
  const selectedBrandItem: SearchableSelectItem | null = product?.brand
    ? { value: product.brand.id, label: product.brand.name }
    : null;
  const selectedTaxRateItem: SearchableSelectItem | null = product?.taxRate
    ? {
        value: product.taxRate.id,
        label: `${product.taxRate.name} (${product.taxRate.rate}%)`,
      }
    : null;

  const onValidationError = (errors: typeof form.formState.errors) => {
    // Surface the first error message as a toast — covers errors on fields
    // that aren't directly rendered (e.g. the top-level "variants" issue
    // when nothing has been generated yet).
    const firstMessage = collectFirstMessage(errors);
    if (firstMessage) toast.error(firstMessage);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditing) {
        const saved = await updateProduct.mutateAsync({
          id: product.id,
          payload: {
            name: values.name,
            description: values.description || undefined,
            categoryId: values.categoryId || undefined,
            brandId: values.brandId || undefined,
            taxRateId: values.taxRateId || undefined,
            isActive: values.isActive,
          },
        });
        // For SIMPLE products, push variant changes via the dedicated endpoint
        // (the bulk PUT /products/:id variant path requires re-sending the
        // whole variant set, which is unnecessary for a one-variant product).
        if (!isVariable && product.variants[0] && values.simpleVariant) {
          const sv = values.simpleVariant;
          const v0 = product.variants[0];
          const changed =
            sv.price !== v0.price ||
            sv.cost !== v0.cost ||
            (sv.barcode ?? '') !== (v0.barcode ?? '');
          if (changed) {
            await updateVariant.mutateAsync({
              variantId: v0.id,
              payload: {
                price: sv.price,
                cost: sv.cost,
                barcode: sv.barcode,
              },
            });
          }
        }
        toast.success('Product updated');
        router.push(`/products?focus=${saved.id}`);
      } else {
        const variantPayloads = isVariable
          ? (values.variants ?? []).map((v) => ({
              name: v.name || undefined,
              barcode: v.barcode!,
              price: v.price!,
              cost: v.cost!,
              attributeValueIds: v.attributeValueIds,
            }))
          : [
              {
                barcode: values.simpleVariant?.barcode ?? '',
                price: values.simpleVariant?.price ?? '',
                cost: values.simpleVariant?.cost ?? '',
              },
            ];

        const saved = await createProduct.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          type: values.type,
          categoryId: values.categoryId || undefined,
          brandId: values.brandId || undefined,
          taxRateId: values.taxRateId || undefined,
          variants: variantPayloads,
        });
        toast.success('Product created');
        router.push(`/products?focus=${saved.id}`);
      }
    } catch {
      // hook surfaces the toast
    }
  }, onValidationError);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Type toggle — create only */}
      {!isEditing ? (
        <div className="glass-panel p-6 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Product Type</h2>
          <div className="flex gap-3">
            {[ProductType.SIMPLE, ProductType.VARIABLE].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => form.setValue('type', t)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  productType === t
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--border-glass)] bg-white/60 text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                }`}
              >
                {t === ProductType.SIMPLE ? 'Simple' : 'Variable'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Core fields */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Details</h2>
          {isEditing ? (
            <Switch
              label="Active"
              checked={isActive ?? true}
              onChange={(checked) => form.setValue('isActive', checked)}
            />
          ) : null}
        </div>
        <FormField<ProductFormData>
          name="name"
          control={form.control}
          label="Name"
        />
        <FormField<ProductFormData>
          name="description"
          control={form.control}
          label="Description"
          placeholder="Optional description"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <SearchableSelect
                label="Category"
                value={field.value || null}
                onChange={(val) => field.onChange(val ?? '')}
                fetchItems={fetchCategories}
                selectedItem={selectedCategoryItem}
                emptyOptionLabel="No category"
                placeholder="Search categories…"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="brandId"
            render={({ field, fieldState }) => (
              <SearchableSelect
                label="Brand"
                value={field.value || null}
                onChange={(val) => field.onChange(val ?? '')}
                fetchItems={fetchBrands}
                selectedItem={selectedBrandItem}
                emptyOptionLabel="No brand"
                placeholder="Search brands…"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="taxRateId"
            render={({ field, fieldState }) => (
              <SearchableSelect
                label="Tax Rate"
                value={field.value || null}
                onChange={(val) => field.onChange(val ?? '')}
                fetchItems={fetchTaxRates}
                selectedItem={selectedTaxRateItem}
                emptyOptionLabel="No tax"
                placeholder="Search tax rates…"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </div>

      {/* SIMPLE pricing — editable for both create and edit */}
      {!isVariable ? (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Pricing & Barcode
            </h2>
            {isEditing && product?.variants[0] ? (
              <span className="font-mono text-xs text-slate-400">
                SKU: {product.variants[0].sku}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField<ProductFormData>
              name="simpleVariant.price"
              control={form.control}
              label="Price"
              placeholder="0.00"
            />
            <FormField<ProductFormData>
              name="simpleVariant.cost"
              control={form.control}
              label="Cost"
              placeholder="0.00"
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField<ProductFormData>
                  name="simpleVariant.barcode"
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
                onClick={() => void generateSimpleBarcode()}
              >
                <Barcode size={14} />
                Generate
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* VARIABLE — create: attribute picker + generator + variant rows */}
      {isVariable && !isEditing ? (
        <div className="glass-panel p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Attributes</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Pick the attributes that define this product, then choose the values for each.
            </p>
          </div>

          <MultiSearchableSelect
            label="Attributes"
            value={selectedAttributeIds}
            onChange={handleAttributesChange}
            fetchItems={fetchAttributeOptions}
            selectedItems={selectedAttributeItems}
            placeholder="Search attributes…"
            noResultsLabel={
              activeAttributes.length === 0
                ? 'No attributes configured. Add them in Settings → Attributes.'
                : 'No results'
            }
          />

          {selectedAttributeIds.length > 0 ? (
            <div className="space-y-3">
              {selectedAttributeIds.map((attrId) => {
                const attr = attributeIndex.get(attrId);
                if (!attr) return null;
                return (
                  <MultiSearchableSelect
                    key={attrId}
                    label={`${attr.name} values`}
                    value={valueIdsByAttr[attrId] ?? []}
                    onChange={(next) =>
                      setValueIdsByAttr((prev) => ({ ...prev, [attrId]: next }))
                    }
                    fetchItems={fetchValueOptions(attrId)}
                    placeholder={`Search ${attr.name.toLowerCase()}…`}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
            <div>
              <Input
                label="Bulk price"
                placeholder="0.00"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Bulk cost"
                placeholder="0.00"
                value={bulkCost}
                onChange={(e) => setBulkCost(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={applyBulkToAll}
                disabled={fields.length === 0}
              >
                Apply to all
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-glass)] pt-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {fields.length === 0
                ? 'No variants generated yet.'
                : `${fields.length} variant${fields.length === 1 ? '' : 's'} generated`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={fields.length === 0}
                isLoading={generateBarcodes.isPending}
                onClick={() => void generateAllBarcodes()}
              >
                <Barcode size={14} />
                Generate all barcodes
              </Button>
              <Button type="button" onClick={generateVariations}>
                <Wand2 size={14} />
                Generate Variations
              </Button>
            </div>
          </div>

          {form.formState.errors.variants &&
          !Array.isArray(form.formState.errors.variants) &&
          form.formState.errors.variants.message ? (
            <p className="text-xs font-medium text-[var(--danger)]">
              {form.formState.errors.variants.message}
            </p>
          ) : null}

          {fields.length > 0 ? (
            <div className="space-y-2">
              {fields.map((field, index) => {
                const valueIds = form.getValues(`variants.${index}.attributeValueIds`);
                const title = variantTitle(valueIds);
                const isOpen = expanded[field.id] ?? false;
                const rowErrors = form.formState.errors.variants?.[index];
                const hasError =
                  rowErrors &&
                  (rowErrors.price || rowErrors.cost || rowErrors.barcode);
                return (
                  <div
                    key={field.id}
                    className={`rounded-2xl border bg-white/60 ${
                      hasError ? 'border-[var(--danger)]' : 'border-[var(--border-glass)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((p) => ({ ...p, [field.id]: !isOpen }))
                      }
                      className="flex w-full items-center justify-between gap-3 p-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronUp size={14} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400" />
                        )}
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {title}
                        </span>
                        {hasError ? (
                          <span className="text-xs font-medium text-[var(--danger)]">
                            • Missing fields
                          </span>
                        ) : null}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(index);
                        }}
                        className="rounded p-1 hover:bg-rose-50"
                        aria-label="Remove variant"
                      >
                        <Trash2 size={13} className="text-rose-400" />
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-[var(--border-glass)] p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <FormField<ProductFormData>
                            name={`variants.${index}.price`}
                            control={form.control}
                            label="Price"
                            placeholder="0.00"
                          />
                          <FormField<ProductFormData>
                            name={`variants.${index}.cost`}
                            control={form.control}
                            label="Cost"
                            placeholder="0.00"
                          />
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <FormField<ProductFormData>
                                name={`variants.${index}.barcode`}
                                control={form.control}
                                label="Barcode"
                                placeholder="Generate to set"
                                readOnly
                              />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              title="Auto-generate barcode"
                              isLoading={generateBarcodes.isPending}
                              onClick={() => void generateRowBarcode(index)}
                            >
                              <Barcode size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* VARIABLE — edit: full variant management embedded */}
      {isVariable && isEditing ? (
        <div className="glass-panel p-6">
          <VariantsPanel product={product} />
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? isEditing
              ? 'Updating…'
              : 'Creating…'
            : isEditing
              ? 'Update Product'
              : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}

function collectFirstMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  // react-hook-form error trees can be nested objects or arrays; walk depth-first.
  const stack: unknown[] = [errors];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    const record = node as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message) return record.message;
    for (const v of Object.values(record)) {
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}
