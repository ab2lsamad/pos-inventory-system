'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Barcode, ChevronDown, ChevronUp, Trash2, Wand2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MultiSearchableSelect from '@/components/ui/MultiSearchableSelect';
import type { SearchableSelectItem } from '@/components/ui/SearchableSelect';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useGenerateBarcodes } from '@/hooks/products/useGenerateBarcodes';
import type { Attribute } from '@/types/attribute';

export interface GeneratedVariant {
  key: string;
  attributeValueIds: string[];
  price: string;
  cost: string;
  barcode: string;
  // Set when the combination matches an existing variant; saving will
  // update that variant in place rather than create a new one.
  existingVariantId?: string;
}

interface VariantGeneratorProps {
  value: GeneratedVariant[];
  onChange: (next: GeneratedVariant[]) => void;
  // Existing combinations to detect conflicts. Each entry is the set of
  // attribute-value ids defining a variant; the optional id lets the parent
  // decide between "update existing" and "skip".
  existingCombos?: { id?: string; attributeValueIds: string[] }[];
  // Lock the existing combos so they can't be removed/regenerated away
  // (used when editing an existing variable product).
  lockExisting?: boolean;
  // Error map keyed by variant key — caller renders per-field validation.
  errorByKey?: Record<string, { price?: string; cost?: string; barcode?: string }>;
  rootError?: string;
  // Toggle to render each row collapsed/expanded by default.
  defaultCollapsed?: boolean;
}

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function fetchAttributes(): Promise<Attribute[]> {
  const res = await api.get<Attribute[]>(API_ENDPOINTS.attributes.list(1, 200));
  return Array.isArray(res.data) ? res.data : [];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const x of b) if (!setA.has(x)) return false;
  return true;
}

export default function VariantGenerator({
  value,
  onChange,
  existingCombos = [],
  lockExisting = false,
  errorByKey = {},
  rootError,
  defaultCollapsed = true,
}: VariantGeneratorProps) {
  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes', 'all'],
    queryFn: fetchAttributes,
    staleTime: 60_000,
  });
  const generateBarcodes = useGenerateBarcodes();

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

  const generate = () => {
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

    // Preserve existing rows when lockExisting is set; otherwise rebuild list.
    const keep = lockExisting ? value.filter((v) => v.existingVariantId) : [];
    const next: GeneratedVariant[] = [...keep];

    let skipped = 0;
    let matched = 0;

    for (const combo of combos) {
      // Match against rows already in the working list (locked existing or
      // previously generated) so we don't add duplicates within the form.
      const existsInWorkingSet = next.some((row) =>
        sameSet(row.attributeValueIds, combo),
      );
      if (existsInWorkingSet) {
        skipped += 1;
        continue;
      }
      // Match against externally provided existing combos (e.g. variants
      // already saved on the product but not locked into the working set).
      const externalMatch = existingCombos.find((c) =>
        sameSet(c.attributeValueIds, combo),
      );
      if (externalMatch) {
        matched += 1;
        next.push({
          key: rowKey(),
          attributeValueIds: combo,
          price: bulkPrice,
          cost: bulkCost,
          barcode: '',
          existingVariantId: externalMatch.id,
        });
        continue;
      }
      next.push({
        key: rowKey(),
        attributeValueIds: combo,
        price: bulkPrice,
        cost: bulkCost,
        barcode: '',
      });
    }

    onChange(next);
    setExpanded({});
    if (skipped > 0) toast(`Skipped ${skipped} duplicate combination${skipped === 1 ? '' : 's'}`);
    if (matched > 0)
      toast(`${matched} combination${matched === 1 ? '' : 's'} match an existing variant — will be updated`);
  };

  const applyBulkToAll = () => {
    if (!bulkPrice && !bulkCost) {
      toast.error('Enter a bulk price or cost first');
      return;
    }
    onChange(
      value.map((v) => ({
        ...v,
        price: bulkPrice || v.price,
        cost: bulkCost || v.cost,
      })),
    );
    toast.success('Applied to all variants');
  };

  const updateRow = (key: string, patch: Partial<GeneratedVariant>) => {
    onChange(value.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  const removeRow = (key: string) => {
    onChange(value.filter((v) => v.key !== key));
  };

  const generateAllBarcodes = async () => {
    if (value.length === 0) {
      toast.error('Generate variations first');
      return;
    }
    try {
      const codes = await generateBarcodes.mutateAsync(value.length);
      onChange(value.map((v, i) => (codes[i] ? { ...v, barcode: codes[i] } : v)));
      toast.success('Barcodes generated');
    } catch {
      // hook surfaces the toast
    }
  };

  const generateRowBarcode = async (key: string) => {
    try {
      const [code] = await generateBarcodes.mutateAsync(1);
      if (code) updateRow(key, { barcode: code });
    } catch {
      // hook surfaces the toast
    }
  };

  const variantTitle = (valueIds: string[]): string => {
    if (valueIds.length === 0) return 'Variant';
    const parts: string[] = [];
    for (const id of valueIds) {
      const entry = valueIndex.get(id);
      if (entry) parts.push(entry.valueLabel);
    }
    return parts.join(' / ') || 'Variant';
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Attributes</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Pick attributes, choose values, then generate variations.
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
        <Input
          label="Bulk price"
          placeholder="0.00"
          value={bulkPrice}
          onChange={(e) => setBulkPrice(e.target.value)}
        />
        <Input
          label="Bulk cost"
          placeholder="0.00"
          value={bulkCost}
          onChange={(e) => setBulkCost(e.target.value)}
        />
        <Button variant="secondary" onClick={applyBulkToAll} disabled={value.length === 0}>
          Apply to all
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-glass)] pt-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {value.length === 0
            ? 'No variants yet.'
            : `${value.length} variant${value.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={value.length === 0}
            isLoading={generateBarcodes.isPending}
            onClick={() => void generateAllBarcodes()}
          >
            <Barcode size={14} />
            Generate all barcodes
          </Button>
          <Button onClick={generate}>
            <Wand2 size={14} />
            Generate Variations
          </Button>
        </div>
      </div>

      {rootError ? (
        <p className="text-xs font-medium text-[var(--danger)]">{rootError}</p>
      ) : null}

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((row) => {
            const isOpen = expanded[row.key] ?? !defaultCollapsed;
            const errors = errorByKey[row.key];
            const hasError = !!(errors?.price || errors?.cost || errors?.barcode);
            const locked = lockExisting && !!row.existingVariantId;
            return (
              <div
                key={row.key}
                className={`rounded-2xl border bg-white/60 ${
                  hasError ? 'border-[var(--danger)]' : 'border-[var(--border-glass)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [row.key]: !isOpen }))}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronUp size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {variantTitle(row.attributeValueIds)}
                    </span>
                    {row.existingVariantId ? (
                      <span className="text-xs font-medium text-amber-500">
                        • Updates existing
                      </span>
                    ) : null}
                    {hasError ? (
                      <span className="text-xs font-medium text-[var(--danger)]">
                        • Missing fields
                      </span>
                    ) : null}
                  </div>
                  {locked ? null : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRow(row.key);
                      }}
                      className="rounded p-1 hover:bg-rose-50"
                      aria-label="Remove variant"
                    >
                      <Trash2 size={13} className="text-rose-400" />
                    </span>
                  )}
                </button>
                {isOpen ? (
                  <div className="border-t border-[var(--border-glass)] p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Price"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) => updateRow(row.key, { price: e.target.value })}
                        error={errors?.price}
                      />
                      <Input
                        label="Cost"
                        placeholder="0.00"
                        value={row.cost}
                        onChange={(e) => updateRow(row.key, { cost: e.target.value })}
                        error={errors?.cost}
                      />
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input
                            label="Barcode"
                            placeholder="Generate to set"
                            value={row.barcode}
                            readOnly
                            error={errors?.barcode}
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          title="Auto-generate barcode"
                          isLoading={generateBarcodes.isPending}
                          onClick={() => void generateRowBarcode(row.key)}
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
  );
}
