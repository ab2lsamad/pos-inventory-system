'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import SearchableSelect, {
  type SearchableSelectItem,
} from '@/components/ui/SearchableSelect';
import Switch from '@/components/ui/Switch';
import { categorySchema } from '@/schemas/category';
import type { CategoryFormData } from '@/schemas/category';
import type { Category, CreateCategoryPayload } from '@/types/category';
import { useCreateCategory } from '@/hooks/categories/useCreateCategory';
import { useUpdateCategory } from '@/hooks/categories/useUpdateCategory';
import { fetchCategoryParentOptions } from '@/hooks/categories/useCategoriesTreeOptions';
import { fetchTaxRateOptions } from '@/hooks/categories/useTaxRatesOptions';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

const defaults: CategoryFormData = {
  code: '',
  name: '',
  description: '',
  parentId: '',
  taxRateId: '',
  isActive: true,
};

export default function CategoryFormModal({ isOpen, onClose, category }: CategoryFormModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isPending = createCategory.isPending || updateCategory.isPending;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      category
        ? {
            code: category.code,
            name: category.name,
            description: category.description ?? '',
            parentId: category.parentId ?? '',
            taxRateId: category.taxRateId ?? '',
            isActive: category.isActive,
          }
        : defaults,
    );
  }, [isOpen, category, form]);

  const fetchParents = useCallback(
    (search: string) =>
      fetchCategoryParentOptions({ excludeId: category?.id, search }),
    [category?.id],
  );

  const fetchTaxes = useCallback(
    (search: string) => fetchTaxRateOptions(search),
    [],
  );

  // Pre-populate display item for the currently-selected parent / tax so the
  // collapsed button can show its label before any search fires.
  const parentSelectedItem = useMemo<SearchableSelectItem | null>(() => {
    if (!category?.parentId || !category.parent) return null;
    return { value: category.parentId, label: category.parent.name };
  }, [category]);

  const taxSelectedItem = useMemo<SearchableSelectItem | null>(() => {
    if (!category?.taxRateId || !category.taxRate) return null;
    return {
      value: category.taxRateId,
      label: category.taxRate.name,
      sublabel: `${category.taxRate.rate}%`,
    };
  }, [category]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (category && values.parentId && values.parentId === category.id) {
      toast.error('A category cannot be its own parent');
      return;
    }

    const payload: CreateCategoryPayload = {
      code: values.code.toUpperCase(),
      name: values.name,
      isActive: values.isActive,
    };
    if (values.description) payload.description = values.description;
    if (values.parentId && values.parentId !== '') payload.parentId = values.parentId;
    if (values.taxRateId && values.taxRateId !== '') payload.taxRateId = values.taxRateId;

    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, payload });
        toast.success(`Category updated: ${payload.code}`);
      } else {
        const res = await createCategory.mutateAsync(payload);
        toast.success(`Category created: ${res.code}`);
      }
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit Category' : 'New Category'}
      formId="category-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={category ? 'Update' : 'Create'}
    >
      <form id="category-form" onSubmit={onSubmit} className="space-y-4">
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Input
              id="code"
              ref={field.ref}
              label="Code"
              placeholder="e.g. ELEC or FOOD_FRESH"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              style={{ textTransform: 'uppercase' }}
              autoCapitalize="characters"
              spellCheck={false}
            />
          )}
        />
        <FormField<CategoryFormData>
          name="name"
          control={form.control}
          label="Name"
          placeholder="Category name"
        />
        <FormField<CategoryFormData>
          name="description"
          control={form.control}
          label="Description"
          placeholder="Optional description"
        />
        <Controller
          name="parentId"
          control={form.control}
          render={({ field, fieldState }) => (
            <SearchableSelect
              id="parentId"
              label="Parent Category"
              placeholder="Search categories…"
              emptyOptionLabel="— No parent —"
              noResultsLabel="No categories found"
              value={field.value || null}
              onChange={(val) => field.onChange(val ?? '')}
              fetchItems={fetchParents}
              selectedItem={parentSelectedItem}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="taxRateId"
          control={form.control}
          render={({ field, fieldState }) => (
            <SearchableSelect
              id="taxRateId"
              label="Default Tax Rate"
              placeholder="Search tax rates…"
              emptyOptionLabel="— None —"
              noResultsLabel="No tax rates found"
              value={field.value || null}
              onChange={(val) => field.onChange(val ?? '')}
              fetchItems={fetchTaxes}
              selectedItem={taxSelectedItem}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="category-isActive"
              checked={field.value}
              onChange={field.onChange}
              label="Active"
            />
          )}
        />
      </form>
    </Modal>
  );
}
