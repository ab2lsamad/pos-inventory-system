'use client';

import { useMemo, useState } from 'react';
import { Percent, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { format } from '@/lib/money';
import { useDiscountsList } from '@/hooks/settings/useDiscountsList';
import { DiscountScope, DiscountType } from '@/types/shared';
import type { CartLineDiscount } from '@/types/pos';
import type { Discount } from '@/types/discount';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scope: DiscountScope;
  contextLabel?: string;
  // Line-item only: the variant the discount will apply to. Catalog discounts
  // pinned to specific variants are hidden unless this variant is among them.
  variantId?: string;
  // Line-item only: the item's current unit price. The custom tab asks for the
  // new discounted unit price and derives an equivalent percentage discount.
  basePrice?: string;
  currency?: string;
  onSelect: (discount: CartLineDiscount) => void;
}

const now = () => Date.now();

function isUsable(d: Discount): boolean {
  if (!d.isActive) return false;
  const t = now();
  if (d.startsAt && new Date(d.startsAt).getTime() > t) return false;
  if (d.endsAt && new Date(d.endsAt).getTime() < t) return false;
  if (d.maxUses != null && d.usageCount >= d.maxUses) return false;
  return true;
}

// Tabs are ordered (and default-selected) the same way for every scope: Custom
// first, catalog second.
const TABS: { id: 'custom' | 'catalog'; label: string }[] = [
  { id: 'custom', label: 'Custom' },
  { id: 'catalog', label: 'From catalog' },
];

export default function DiscountPickerModal({
  isOpen,
  onClose,
  scope,
  contextLabel,
  variantId,
  basePrice,
  currency = 'PKR',
  onSelect,
}: Props) {
  const { data, isLoading } = useDiscountsList({ pageSize: 100, includeArchived: false });

  const isLineItem = scope === DiscountScope.LINE_ITEM;

  const [mode, setMode] = useState<'catalog' | 'custom'>('custom');
  const [type, setType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [value, setValue] = useState('');
  const [name, setName] = useState('');

  // Reset the form each time the modal transitions to open. Done during render
  // (not in an effect) to avoid the cascading re-render an effect would cause.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setMode('custom');
      setType(DiscountType.PERCENTAGE);
      setValue('');
      setName('');
    }
  }

  const eligible = useMemo(
    () =>
      data.filter((d) => {
        if (d.scope !== scope || !isUsable(d)) return false;
        // Variant-targeted line discounts are only offered for matching items.
        // An empty target set is unrestricted.
        const targets = d.targetVariants ?? [];
        if (targets.length > 0)
          return !!variantId && targets.some((t) => t.variantId === variantId);
        return true;
      }),
    [data, scope, variantId],
  );

  const pickCatalog = (d: Discount) => {
    onSelect({
      discountId: d.id,
      name: d.name,
      type: d.type,
      value: d.value,
    });
    onClose();
  };

  // Line-item custom: `value` is the new discounted unit price. We store an
  // equivalent PERCENTAGE discount so it scales with quantity (it's applied to
  // the line gross). The percentage is kept at full precision — rounding it to
  // 2 dp reintroduces sub-cent errors (e.g. 1199→1000 as 16.60% deducts 199.03
  // instead of 199.00). Only the cent-rounded amount is ever sent on checkout.
  const submitLineItemPrice = () => {
    const base = parseFloat(basePrice ?? '');
    const num = parseFloat(value);
    if (!base || base <= 0) {
      toast.error('This item has no base price to discount');
      return;
    }
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid discounted price');
      return;
    }
    if (num >= base) {
      toast.error('Discounted price must be lower than the current price');
      return;
    }
    const percent = ((base - num) / base) * 100;
    onSelect({
      name: `Price ${format(currency, num.toFixed(2))}`,
      type: DiscountType.PERCENTAGE,
      value: String(percent),
    });
    onClose();
  };

  // Order custom: classic name + type + value.
  const submitOrderCustom = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      toast.error('Enter a value greater than zero');
      return;
    }
    if (type === DiscountType.PERCENTAGE && num > 100) {
      toast.error('Percentage cannot exceed 100');
      return;
    }
    onSelect({
      name: name.trim() || (type === DiscountType.PERCENTAGE ? `Manual ${num}%` : `Manual discount`),
      type,
      value: num.toFixed(2),
    });
    onClose();
  };

  const scopeLabel = scope === DiscountScope.ORDER ? 'Order' : 'Line item';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Apply ${scopeLabel} Discount`}
      maxWidth="max-w-md"
    >
      {contextLabel && (
        <p className="-mt-2 mb-3 text-xs text-slate-500">
          For: <span className="font-semibold text-slate-700">{contextLabel}</span>
        </p>
      )}

      <div className="mb-4 flex rounded-lg border border-slate-200 p-1 text-xs font-semibold">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-md py-1.5 transition ${
              mode === tab.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'catalog' && (
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {isLoading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
          {!isLoading && eligible.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              No active {scopeLabel.toLowerCase()} discounts available.
            </p>
          )}
          {eligible.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => pickCatalog(d)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{d.name}</p>
                <p className="font-mono text-[10px] tracking-wider text-slate-400">{d.code}</p>
              </div>
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {d.type === DiscountType.PERCENTAGE ? (
                  <>
                    <Percent size={10} />
                    {d.value}
                  </>
                ) : (
                  <>−{d.value}</>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && isLineItem && (
        <div className="space-y-3">
          {basePrice && (
            <p className="text-xs text-slate-500">
              Current price:{' '}
              <span className="font-semibold text-slate-700">
                {format(currency, basePrice)}
              </span>
            </p>
          )}
          <Input
            id="discount-custom-price"
            label="Discounted price"
            placeholder="e.g. 400"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            icon={<Tag size={14} />}
          />
          <p className="text-[11px] text-slate-400">
            We&apos;ll convert this to an equivalent percentage discount automatically.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submitLineItemPrice}>
              Apply
            </Button>
          </div>
        </div>
      )}

      {mode === 'custom' && !isLineItem && (
        <div className="space-y-3">
          <Input
            id="discount-custom-name"
            label="Name (optional)"
            placeholder="e.g. Manager override"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="discount-custom-type"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              options={[
                { value: DiscountType.PERCENTAGE, label: 'Percentage (%)' },
                { value: DiscountType.FIXED_AMOUNT, label: 'Fixed amount' },
              ]}
            />
            <Input
              id="discount-custom-value"
              label="Value"
              placeholder={type === DiscountType.PERCENTAGE ? 'e.g. 10' : 'e.g. 150'}
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              icon={type === DiscountType.PERCENTAGE ? <Percent size={14} /> : <Tag size={14} />}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submitOrderCustom}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
