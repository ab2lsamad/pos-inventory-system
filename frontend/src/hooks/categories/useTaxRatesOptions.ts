'use client';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { TaxRate } from '@/types/tax-rate';
import type { SearchableSelectItem } from '@/components/ui/SearchableSelect';

export async function fetchTaxRateOptions(
  search?: string,
): Promise<SearchableSelectItem[]> {
  const url = API_ENDPOINTS.taxRates.list(
    1,
    100,
    search ? { search } : undefined,
  );
  const res = await api.get(url);
  const items: TaxRate[] = res.data?.data ?? [];
  return items
    .filter((t) => t.isActive)
    .map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: `${t.rate}%`,
    }));
}
