'use client';

import { useState } from 'react';
import { SlidersHorizontal, ListOrdered, Search, ClipboardList } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import LevelsTable from '@/components/inventory/LevelsTable';
import MovementsTable from '@/components/inventory/MovementsTable';
import ManualAdjustModal from '@/components/inventory/ManualAdjustModal';
import StockCountModal from '@/components/inventory/StockCountModal';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import { StockMovementType } from '@/types/shared';

type Tab = 'levels' | 'movements';

const MOVEMENT_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...Object.values(StockMovementType).map((t) => ({
    value: t,
    label: t
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  })),
];

export default function InventoryPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/inventory');

  const [tab, setTab] = useState<Tab>('levels');
  const [levelsPage, setLevelsPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const [search, setSearch] = useState('');
  const storeFilter = '';
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movementType, setMovementType] = useState('');

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    setLevelsPage(1);
  };

  return (
    <PageLayout
      title="Inventory"
      description="Track stock levels and movement history"
      action={
        canManage ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCountOpen(true)}>
              <ClipboardList size={16} />
              Stock Count
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal size={16} />
              Adjust Stock
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col section-gap">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--bg-card)] rounded-2xl w-fit border border-[var(--border-glass)]">
          <button
            onClick={() => setTab('levels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'levels'
                ? 'bg-white text-[var(--text-primary)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListOrdered size={15} />
            Stock Levels
          </button>
          <button
            onClick={() => setTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'movements'
                ? 'bg-white text-[var(--text-primary)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListOrdered size={15} />
            Movements
          </button>
        </div>

        {/* Filters */}
        {tab === 'levels' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Input
                placeholder="Search SKU or product…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                icon={<Search size={16} />}
                id="inventory-search"
              />
            </div>
            <Switch
              checked={lowStockOnly}
              onChange={(val) => {
                setLowStockOnly(val);
                setLevelsPage(1);
              }}
              label="Low stock only"
            />
          </div>
        )}

        {tab === 'movements' && (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setMovementsPage(1);
              }}
              options={MOVEMENT_TYPE_OPTIONS}
              className="w-48"
            />
          </div>
        )}

        {/* Tables */}
        {tab === 'levels' ? (
          <LevelsTable
            page={levelsPage}
            search={search || undefined}
            storeId={storeFilter || undefined}
            lowStockOnly={lowStockOnly}
            canManage={canManage}
            onPageChange={setLevelsPage}
          />
        ) : (
          <MovementsTable
            page={movementsPage}
            storeId={storeFilter || undefined}
            movementType={(movementType as StockMovementType) || undefined}
            onPageChange={setMovementsPage}
          />
        )}
      </div>

      <ManualAdjustModal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
      />
      <StockCountModal
        isOpen={countOpen}
        onClose={() => setCountOpen(false)}
      />
    </PageLayout>
  );
}
