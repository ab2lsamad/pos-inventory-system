'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Smartphone,
  Building2,
  MoreHorizontal,
  X,
  Tag,
  Percent,
  UserPlus,
} from 'lucide-react';
import DiscountPickerModal from './DiscountPickerModal';
import { DiscountScope, DiscountType } from '@/types/shared';
import type { CartLineDiscount } from '@/types/pos';
import Button from '@/components/ui/Button';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { add, format, toNumber } from '@/lib/money';
import { computeChangeDue } from '@/lib/pos-engine';
import type { UseCartReturn } from '@/hooks/pos/useCart';
import type { Product, ProductVariant } from '@/types/product';
import type { Customer } from '@/types/customer';
import type { Salesperson } from '@/hooks/pos/useSalespeople';
import { PaymentMethod } from '@/types/shared';

const PAYMENT_METHODS = [
  { value: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
  { value: PaymentMethod.DEBIT_CARD, label: 'Card', icon: CreditCard },
  { value: PaymentMethod.MOBILE_WALLET, label: 'Wallet', icon: Smartphone },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank', icon: Building2 },
  { value: PaymentMethod.OTHER, label: 'Other', icon: MoreHorizontal },
];

// Shared column template — must be identical in header and every row.
const COL_TEMPLATE = 'grid-cols-[1fr_80px_100px_100px_28px_28px]';

interface CartPanelProps {
  cart: UseCartReturn;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: string;
  onAmountPaidChange: (value: string) => void;
  customer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  salespeople: Salesperson[];
  salesperson: Salesperson | null;
  onSalespersonChange: (salesperson: Salesperson | null) => void;
  currency?: string;
  products: Product[];
  onAddVariant: (product: Product, variant: ProductVariant) => void;
  onAddProductFromBarcode: (product: Product, variant: ProductVariant) => void;
  onClear: () => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
}

// Normalise partial-decimal user input before passing to strict money functions.
function normalizeMoneyInput(value: string): string {
  if (!value || value === '.') return '0';
  if (value.endsWith('.')) return value.slice(0, -1);
  if (value.startsWith('.')) return '0' + value;
  return value;
}

// Chip label for a discount. Percentage values may carry full internal
// precision (custom price-based line discounts), so round them for display.
function discountValueLabel(d: CartLineDiscount): string {
  if (d.type === DiscountType.PERCENTAGE) {
    return `(${parseFloat(Number(d.value).toFixed(2))}%)`;
  }
  return `(−${d.value})`;
}

export default function CartPanel({
  cart,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  customer,
  onCustomerChange,
  salespeople,
  salesperson,
  onSalespersonChange,
  currency = 'PKR',
  products,
  onAddVariant,
  onAddProductFromBarcode,
  onClear,
  onCheckout,
  isCheckingOut,
}: CartPanelProps) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [lineDiscountTarget, setLineDiscountTarget] = useState<{
    variantId: string;
    label: string;
    unitPrice: string;
  } | null>(null);
  const [showOrderDiscount, setShowOrderDiscount] = useState(false);

  // Keep the barcode field focused so a scanner gun "just works" — on mount and
  // again every time the cart's item count changes (i.e. a product was added).
  const itemCount = cart.itemCount;
  useEffect(() => {
    barcodeRef.current?.focus();
  }, [itemCount]);

  const applyLineDiscount = (variantId: string, discount: CartLineDiscount) => {
    const line = cart.items.find((l) => l.variantId === variantId);
    if (!line) return;
    cart.updateLineDiscounts(variantId, [...line.discounts, discount]);
  };

  const removeLineDiscount = (variantId: string, index: number) => {
    const line = cart.items.find((l) => l.variantId === variantId);
    if (!line) return;
    cart.updateLineDiscounts(
      variantId,
      line.discounts.filter((_, i) => i !== index),
    );
  };

  const grandTotal = cart.grandTotal;
  const subtotal = cart.items.reduce((sum, item) => add(sum, item.runningTotals.lineGross), '0.00');
  const totalDiscount = cart.items.reduce(
    (sum, item) => add(sum, item.runningTotals.lineDiscount),
    '0.00',
  );
  const totalTax = cart.items.reduce((sum, item) => add(sum, item.runningTotals.lineTax), '0.00');
  const preOrderDiscountTotal = (
    toNumber(subtotal) - toNumber(totalDiscount) + toNumber(totalTax)
  ).toFixed(2);
  const totalOrderDiscount = Math.max(
    toNumber(preOrderDiscountTotal) - toNumber(grandTotal),
    0,
  ).toFixed(2);

  const safeAmountPaid = normalizeMoneyInput(amountPaid || '0');
  const changeDue =
    paymentMethod === PaymentMethod.CASH
      ? computeChangeDue(grandTotal, safeAmountPaid)
      : '0.00';

  const updateQuantity = (variantId: string, delta: number) => {
    const item = cart.items.find((e) => e.variantId === variantId);
    if (!item) return;
    const newQty = item.quantity + delta;
    cart.updateQuantity(variantId, newQty <= 0 ? 0 : newQty);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Checkout</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {cart.items.length > 0
              ? `${cart.itemCount} items in current order`
              : 'Tap products or scan a barcode'}
          </p>
        </div>
        <div className="w-52 sm:w-60">
          <BarcodeScanInput
            ref={barcodeRef}
            id="pos-barcode"
            placeholder="Scan barcode"
            className="text-sm"
            products={products}
            onScan={({ product, variant }) => {
              // Cache API-resolved products so they appear in the grid; harmless
              // for locally-matched ones (it just upserts).
              onAddProductFromBarcode(product, variant);
              onAddVariant(product, variant);
            }}
          />
        </div>
      </div>

      {/* Order bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          {customer ? (
            <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Tag size={12} className="shrink-0 text-[var(--accent)]" />
              <span className="truncate">
                {customer.fullName}
                {customer.phone ? ` · ${customer.phone}` : ''}
              </span>
              <button
                type="button"
                onClick={() => onCustomerChange(null)}
                aria-label="Remove customer"
                className="ml-0.5 shrink-0 text-slate-400 hover:text-rose-500"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateCustomer(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
            >
              <UserPlus size={12} />
              Add customer
            </button>
          )}
          {salespeople.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
              <UserPlus size={12} className="shrink-0" />
              <select
                value={salesperson?.id ?? ''}
                onChange={(e) =>
                  onSalespersonChange(
                    salespeople.find((s) => s.id === e.target.value) ?? null,
                  )
                }
                aria-label="Salesperson"
                className="max-w-[140px] truncate bg-transparent text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
              >
                <option value="">Salesperson…</option>
                {salespeople.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName || s.email}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Receipt size={16} />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Current Order</h2>
          </div>
          {cart.items.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart items — tabular */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30">
        {cart.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-200">
              <ShoppingBag size={28} />
            </div>
            <p className="text-sm font-medium">Cart is empty</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div
              className={`grid ${COL_TEMPLATE} gap-x-2 border-b border-slate-100 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400`}
            >
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Price</span>
              <span className="text-center">Total</span>
              <span />
              <span />
            </div>

            {/* Table rows */}
            {cart.items.map((item) => (
              <div
                key={item.variantId}
                className={`grid ${COL_TEMPLATE} items-center gap-x-2 border-b border-slate-100/70 bg-white px-3 py-2 last:border-0`}
              >
                {/* Product info */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {item.productName}
                  </p>
                  {/* Variant name — attributes shown as pills below, not duplicated here */}
                  <p className="truncate text-xs text-slate-400">{item.variantName}</p>
                  {item.attributeChips.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {item.attributeChips.map((chip) => (
                        <span
                          key={chip.attributeName}
                          className="inline-flex items-center rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-semibold text-indigo-600"
                        >
                          {chip.attributeName}: {chip.value}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-0.5 font-mono text-[9px] tracking-wider text-slate-400">
                    {item.sku}
                  </p>
                  {item.discounts.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {(() => {
                        let manualIdx = -1;
                        return item.discounts.map((d, i) => {
                          const isAuto = !!(
                            d.discountId && cart.autoAppliedIds.has(d.discountId)
                          );
                          if (!isAuto) manualIdx += 1;
                          const myManualIdx = manualIdx;
                          return (
                            <span
                              key={`${d.discountId ?? d.name}-${i}`}
                              className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold ${
                                isAuto
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                              title={isAuto ? 'Auto-applied — click × to skip on this sale' : undefined}
                            >
                              {isAuto && <span className="opacity-70">auto:</span>}
                              {d.name}{' '}
                              {discountValueLabel(d)}
                              <button
                                type="button"
                                onClick={() =>
                                  isAuto
                                    ? cart.suppressAutoDiscount(d.discountId!)
                                    : removeLineDiscount(item.variantId, myManualIdx)
                                }
                                className={`ml-0.5 ${
                                  isAuto
                                    ? 'text-amber-500 hover:text-amber-800'
                                    : 'text-emerald-500 hover:text-emerald-800'
                                }`}
                                aria-label="Remove discount"
                              >
                                <X size={9} />
                              </button>
                            </span>
                          );
                        });
                      })()}
                    </div>
                  )}
                  {toNumber(item.runningTotals.lineDiscount) > 0 && (
                    <p className="text-[9px] text-emerald-600">
                      −{format(currency, item.runningTotals.lineDiscount)} discount
                    </p>
                  )}
                  {toNumber(item.runningTotals.lineTax) > 0 && (
                    <p className="text-[9px] text-slate-400">
                      +{format(currency, item.runningTotals.lineTax)} tax ({item.taxRatePercent}%)
                    </p>
                  )}
                </div>

                {/* Qty controls */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                {/* Unit price */}
                <span className="text-right text-xs font-medium text-slate-500">
                  {format(currency, item.unitPrice)}
                </span>

                {/* Line total */}
                <span className="text-right text-sm font-bold text-[var(--text-primary)]">
                  {format(currency, item.runningTotals.lineNet)}
                </span>

                {/* Discount */}
                <button
                  onClick={() =>
                    setLineDiscountTarget({
                      variantId: item.variantId,
                      label: `${item.productName} — ${item.variantName}`,
                      unitPrice: item.unitPrice,
                    })
                  }
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-emerald-50 hover:text-emerald-600"
                  title="Apply discount"
                  aria-label="Apply discount"
                >
                  <Percent size={12} />
                </button>

                {/* Remove */}
                <button
                  onClick={() => cart.removeItem(item.variantId)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment / totals panel */}
      {cart.items.length > 0 && (
        <div className="z-10 border-t border-slate-100 bg-white px-4 py-3">
          <div className="flex gap-4 mb-4">
            <div className="basis-[60%]">
              {/* Breakdown */}
              <div className="mb-2 space-y-0.5 border-b border-dashed border-slate-100 pb-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Items</span>
                  <span>{cart.itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>{format(currency, subtotal)}</span>
                </div>
                {toNumber(totalDiscount) > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-600">
                    <span>Line discounts</span>
                    <span>−{format(currency, totalDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tax</span>
                  <span>{format(currency, totalTax)}</span>
                </div>
                {toNumber(totalOrderDiscount) > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-600">
                    <span>Order discount</span>
                    <span>−{format(currency, totalOrderDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOrderDiscount(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Percent size={10} /> Apply order discount
                  </button>
                </div>
                {cart.effectiveOrderDiscounts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(() => {
                      let manualIdx = -1;
                      return cart.effectiveOrderDiscounts.map((d, i) => {
                        const isAuto = !!(
                          d.discountId && cart.autoAppliedIds.has(d.discountId)
                        );
                        if (!isAuto) manualIdx += 1;
                        const myManualIdx = manualIdx;
                        return (
                          <span
                            key={`${d.discountId ?? d.name}-${i}`}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              isAuto
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                            title={isAuto ? 'Auto-applied — click × to skip on this sale' : undefined}
                          >
                            {isAuto && <span className="opacity-70">auto:</span>}
                            {d.name}{' '}
                            {discountValueLabel(d)}
                            <button
                              type="button"
                              onClick={() =>
                                isAuto
                                  ? cart.suppressAutoDiscount(d.discountId!)
                                  : cart.removeOrderDiscount(myManualIdx)
                              }
                              className={
                                isAuto
                                  ? 'text-amber-500 hover:text-amber-800'
                                  : 'text-emerald-500 hover:text-emerald-800'
                              }
                              aria-label="Remove order discount"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Grand total */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Grand Total</span>
                <span className="text-lg font-black tracking-tight text-[var(--accent)]">
                  {format(currency, grandTotal)}
                </span>
              </div>
            </div>
            <div className="basis-[40%] ps-4 border-s border-slate-100">
              {/* Payment method */}
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Payment Method
              </p>
              <div className="mb-3 grid grid-cols-5 gap-1.5">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => onPaymentMethodChange(value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-xs font-semibold transition-all ${
                      paymentMethod === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                        : 'border-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
              {/* Cash fields */}
              {paymentMethod === PaymentMethod.CASH && (
                <>
                  <div className="mb-1.5 flex items-center gap-3">
                    <label htmlFor="amount-paid" className="shrink-0 text-xs font-medium text-slate-500">
                      Amount Paid
                    </label>
                    <input
                      id="amount-paid"
                      type="text"
                      inputMode="decimal"
                      value={amountPaid}
                      onChange={(e) => onAmountPaidChange(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/12"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Change Due</span>
                    <span
                      className={`text-sm font-bold ${
                        toNumber(changeDue) > 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {format(currency, changeDue)}
                    </span>
                  </div>
                </>
              )}

              {paymentMethod !== PaymentMethod.CASH && (
                <div>
                  <p className="text-[10px] text-slate-400">
                    Non-cash payments must equal the exact total.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={onCheckout}
            isLoading={isCheckingOut}
            size="md"
            className="w-full rounded-xl"
          >
            Confirm Payment
          </Button>
        </div>
      )}

      <DiscountPickerModal
        isOpen={lineDiscountTarget !== null}
        onClose={() => setLineDiscountTarget(null)}
        scope={DiscountScope.LINE_ITEM}
        contextLabel={lineDiscountTarget?.label}
        variantId={lineDiscountTarget?.variantId}
        basePrice={lineDiscountTarget?.unitPrice}
        currency={currency}
        onSelect={(d) => {
          if (lineDiscountTarget) applyLineDiscount(lineDiscountTarget.variantId, d);
        }}
      />

      <DiscountPickerModal
        isOpen={showOrderDiscount}
        onClose={() => setShowOrderDiscount(false)}
        scope={DiscountScope.ORDER}
        onSelect={(d) => cart.addOrderDiscount(d)}
      />

      <CustomerFormModal
        isOpen={showCreateCustomer}
        onClose={() => setShowCreateCustomer(false)}
        customer={null}
        resolveExistingByPhone
        onCreated={(c) => {
          onCustomerChange(c);
          setShowCreateCustomer(false);
        }}
      />
    </div>
  );
}
