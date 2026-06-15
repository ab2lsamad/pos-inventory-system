import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Dashboard restock-alert preferences. The user picks one or more product
 * categories in Settings; the dashboard then scopes its "Restock Alerts" count
 * and "Restock Watchlist" to low-stock items in those categories. Persisted
 * per-browser in localStorage (key `restock-preferences`). When no category is
 * selected the dashboard shows nothing — there is no implicit "all categories".
 */
interface RestockState {
  categoryIds: string[];
  setCategoryIds: (ids: string[]) => void;
}

export const useRestockStore = create<RestockState>()(
  persist(
    (set) => ({
      categoryIds: [],
      setCategoryIds: (ids) => set({ categoryIds: ids }),
    }),
    { name: 'restock-preferences' },
  ),
);
