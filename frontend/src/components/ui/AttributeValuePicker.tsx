'use client';

import React, { useCallback, useMemo } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import SearchableSelect, { type SearchableSelectItem } from './SearchableSelect';
import type { Attribute, AttributeValue } from '@/types/attribute';

interface AttributeValuePickerProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  attributeFilter?: string[];
  disabled?: boolean;
  error?: string;
}

const attributesKey = ['attributes', 'all'] as const;

// The backend GET /attributes returns Attribute[] directly (not a paginated envelope),
// so we read res.data — not res.data.data.
async function fetchAttributes(): Promise<Attribute[]> {
  const res = await api.get<Attribute[]>(API_ENDPOINTS.attributes.list(1, 200));
  return Array.isArray(res.data) ? res.data : [];
}

export default function AttributeValuePicker<TFieldValues extends FieldValues>({
  control,
  name,
  attributeFilter,
  disabled,
  error,
}: AttributeValuePickerProps<TFieldValues>) {
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: attributesKey,
    queryFn: fetchAttributes,
    staleTime: 60_000,
  });

  const visibleAttributes = useMemo(() => {
    const filtered = attributeFilter
      ? attributes.filter((a) => attributeFilter.includes(a.id))
      : attributes;
    return filtered
      .filter((a) => a.isActive)
      .slice()
      .sort((a, b) => a.position - b.position);
  }, [attributes, attributeFilter]);

  // Indexes for O(1) lookups when computing selection state across renders.
  const valueIndex = useMemo(() => {
    const byId = new Map<string, { attribute: Attribute; value: AttributeValue }>();
    for (const attribute of attributes) {
      for (const value of attribute.values) {
        byId.set(value.id, { attribute, value });
      }
    }
    return byId;
  }, [attributes]);

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading attributes…</p>;
  }

  if (visibleAttributes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-glass)] bg-white/60 p-4 text-sm text-[var(--text-secondary)]">
        No attributes configured yet. Set them up in{' '}
        <span className="font-semibold">Settings → Attributes</span> first.
      </div>
    );
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selectedIds: string[] = Array.isArray(field.value) ? field.value : [];

        const positionOf = (valueId: string) => {
          const entry = valueIndex.get(valueId);
          if (!entry) return Number.MAX_SAFE_INTEGER;
          const idx = entry.attribute.values.findIndex((v) => v.id === valueId);
          return entry.attribute.position * 1000 + (idx < 0 ? 999 : idx);
        };

        const handleChange = (attributeId: string, valueId: string | null) => {
          const attribute = visibleAttributes.find((a) => a.id === attributeId);
          if (!attribute) return;
          const otherIds = selectedIds.filter(
            (id) => !attribute.values.some((v) => v.id === id),
          );
          const next = valueId ? [...otherIds, valueId] : otherIds;
          next.sort((a, b) => positionOf(a) - positionOf(b));
          field.onChange(next);
        };

        return (
          <div className="flex flex-col gap-3">
            {visibleAttributes.map((attribute) => {
              const activeValues = attribute.values
                .filter((v) => v.isActive)
                .slice()
                .sort((a, b) => a.position - b.position);

              const selectedForAttribute =
                attribute.values.find((v) => selectedIds.includes(v.id))?.id ?? null;

              // Edge case: selected value may have been deactivated since the
              // variant was saved. Surface it in the trigger so the user sees
              // the actual current state instead of an empty placeholder.
              const selectedItem: SearchableSelectItem | null = (() => {
                if (!selectedForAttribute) return null;
                const entry = valueIndex.get(selectedForAttribute);
                if (!entry) return null;
                const inactive = !entry.value.isActive;
                return {
                  value: entry.value.id,
                  label: entry.value.value + (inactive ? ' (inactive)' : ''),
                };
              })();

              const items: SearchableSelectItem[] = activeValues.map((v) => ({
                value: v.id,
                label: v.value,
              }));

              return (
                <FetchableAttributeSelect
                  key={attribute.id}
                  label={attribute.name}
                  disabled={disabled}
                  value={selectedForAttribute}
                  selectedItem={selectedItem}
                  items={items}
                  emptyOptionLabel={`No ${attribute.name.toLowerCase()}`}
                  placeholder={`Search ${attribute.name.toLowerCase()}…`}
                  onChange={(val) => handleChange(attribute.id, val)}
                />
              );
            })}
            {error ? (
              <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}

interface FetchableAttributeSelectProps {
  label: string;
  disabled?: boolean;
  value: string | null;
  selectedItem: SearchableSelectItem | null;
  items: SearchableSelectItem[];
  emptyOptionLabel: string;
  placeholder: string;
  onChange: (val: string | null) => void;
}

function FetchableAttributeSelect({
  label,
  disabled,
  value,
  selectedItem,
  items,
  emptyOptionLabel,
  placeholder,
  onChange,
}: FetchableAttributeSelectProps) {
  const fetchItems = useCallback(
    async (search: string) => {
      const q = search.trim().toLowerCase();
      if (!q) return items;
      return items.filter((i) => i.label.toLowerCase().includes(q));
    },
    [items],
  );

  return (
    <SearchableSelect
      label={label}
      disabled={disabled}
      value={value}
      selectedItem={selectedItem}
      fetchItems={fetchItems}
      emptyOptionLabel={emptyOptionLabel}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
