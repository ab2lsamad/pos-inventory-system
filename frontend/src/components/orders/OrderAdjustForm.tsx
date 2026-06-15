'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Search, X } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import toast from 'react-hot-toast';
import { format, toNumber } from '@/lib/money';
import { useAuthStore } from '@/store/auth-store';
import { useCart } from '@/hooks/pos/useCart';
import { usePosProductSearch } from '@/hooks/pos/usePosProductSearch';
import { useCategoriesQuery } from '@/hooks/categories/useCategoriesQuery';
import { useDiscountsList } from '@/hooks/settings/useDiscountsList';
import { splitDiscountAmounts } from '@/lib/pos-engine';
import { useOrderReturnSummaryQuery } from '@/hooks/orders/useOrderQuery';
import { useAdjustOrderSale } from '@/hooks/orders/useAdjustOrderSale';
import VariantPicker from '@/components/pos/VariantPicker';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import type { CreateOrderAdjustmentDto } from '@/types/order';
import type { Product, ProductVariant } from '@/types/product';
import type { Discount } from '@/types/discount';
import { DiscountType, PaymentMethod } from '@/types/shared';

const getActiveVariants = (product: Product) => product.variants.filter((v) => v.isActive);

// Mirror POS auto-discount eligibility: requires explicit date window and
// must fall inside it, respect isActive and usage caps.
function isEligibleNow(d: Discount): boolean {
  if (!d.isActive) return false;
  if (!d.startsAt && !d.endsAt) return false;
  const now = Date.now();
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return false;
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return false;
  if (d.maxUses != null && d.usageCount >= d.maxUses) return false;
  return true;
}

interface OrderAdjustFormProps {
  orderId: string;
}

export default function OrderAdjustForm({ orderId }: OrderAdjustFormProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const adjustMutation = useAdjustOrderSale();

  const summaryQuery = useOrderReturnSummaryQuery(orderId);
  const productsQuery = usePosProductSearch({ pageSize: 100 });
  const { data: categories } = useCategoriesQuery({ pageSize: 100 });
  const { data: allDiscounts } = useDiscountsList({ pageSize: 100, includeArchived: false });

  const autoApplyDiscounts = useMemo(
    () => allDiscounts.filter(isEligibleNow),
    [allDiscounts],
  );

  const cart = useCart({ autoApplyDiscounts });

  const summary = summaryQuery.data ?? null;
  const products = productsQuery.products;

  const loading = summaryQuery.isLoading || productsQuery.isLoading;
  const submitting = adjustMutation.isPending;

  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restockFlags, setRestockFlags] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const activeVariants = getActiveVariants(product);
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        activeVariants.some(
          (v) =>
            v.sku.toLowerCase().includes(term) ||
            (v.barcode ?? '').toLowerCase().includes(term) ||
            v.name.toLowerCase().includes(term),
        );
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product: Product, variant: ProductVariant) => {
    const existing = cart.items.find((item) => item.variantId === variant.id);
    if (existing) {
      cart.updateQuantity(variant.id, existing.quantity + 1);
      return;
    }
    cart.addLine({ product, variant, quantity: 1 });
  };

  const addProductToCart = (product: Product) => {
    const activeVariants = getActiveVariants(product);
    if (activeVariants.length === 0) {
      toast.error('No active variants available for this product');
      return;
    }
    if (activeVariants.length === 1) {
      addToCart(product, activeVariants[0]);
      return;
    }
    setVariantPickerProduct(product);
  };

  const updateQuantity = (variantId: string, delta: number) => {
    const item = cart.items.find((e) => e.variantId === variantId);
    if (!item) return;
    const nextQuantity = item.quantity + delta;
    cart.updateQuantity(variantId, nextQuantity <= 0 ? 0 : nextQuantity);
  };

  const setReturnQuantity = (orderItemId: string, value: number, max: number) => {
    const normalized = Number.isNaN(value) ? 0 : Math.max(0, Math.min(max, value));
    setReturnQuantities((prev) => ({ ...prev, [orderItemId]: normalized }));
  };

  const toggleRestock = (orderItemId: string) => {
    setRestockFlags((prev) => ({ ...prev, [orderItemId]: !prev[orderItemId] }));
  };

  const currency = 'PKR';

  const returnedTotal = useMemo(() => {
    if (!summary) return '0';
    return summary.items.reduce((sum, item) => {
      const qty = returnQuantities[item.orderItemId] ?? 0;
      const perUnit = parseFloat(item.effectiveUnitRefund ?? item.unitPrice);
      const lineTotal = (perUnit * qty).toFixed(2);
      return (parseFloat(sum) + parseFloat(lineTotal)).toFixed(2);
    }, '0');
  }, [returnQuantities, summary]);

  const newSaleTotal = cart.grandTotal;

  const netAmount = (parseFloat(newSaleTotal) - parseFloat(returnedTotal)).toFixed(2);

  const changeDue =
    paymentMethod === PaymentMethod.CASH && amountPaid
      ? Math.max(0, parseFloat(amountPaid) - parseFloat(netAmount < '0' ? '0' : netAmount)).toFixed(2)
      : '0.00';

  const handleSubmit = async () => {
    if (!summary || !user?.storeId) {
      toast.error('Adjustment context is missing');
      return;
    }

    const returns = summary.items
      .map((item) => ({
        orderItemId: item.orderItemId,
        quantity: returnQuantities[item.orderItemId] ?? 0,
        restock: restockFlags[item.orderItemId] ?? false,
      }))
      .filter((item) => item.quantity > 0);

    // Send the same shape POS uses: each line carries its discounts as
    // resolved absolute amounts. Backend computes line subtotal/tax/total.
    const newItems = cart.items.map((item) => {
      const amounts = splitDiscountAmounts(
        item.runningTotals.lineGross,
        item.discounts,
      );
      const discounts = item.discounts
        .map((d, i) => ({
          discountId: d.discountId,
          description: d.name,
          amount: amounts[i],
        }))
        .filter((d) => d.amount > 0);
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        discounts: discounts.length > 0 ? discounts : undefined,
      };
    });

    if (!returns.length && !newItems.length) {
      toast.error('Select returned items or add new sale items');
      return;
    }

    const netNumber = parseFloat(netAmount);
    const payload: CreateOrderAdjustmentDto = {
      storeId: summary.storeId,
      paymentMethod,
      amountPaid: netNumber > 0 && amountPaid ? amountPaid : undefined,
      notes: notes.trim() || undefined,
      returns,
      newItems,
    };

    try {
      await adjustMutation.mutateAsync({ orderId, payload });
      toast.success('Adjustment recorded');
      router.push(`/orders/${orderId}`);
    } catch {
      // error toast handled by hook
    }
  };

  const back = (
    <Button variant="ghost" size="icon" onClick={() => router.push(`/orders/${orderId}`)}>
      <ArrowLeft size={18} />
    </Button>
  );

  if (loading) {
    return (
      <PageLayout title="Return / Exchange" back={back}>
        <div className="py-16 text-center text-sm text-[var(--text-muted)]">
          Loading return and exchange workflow...
        </div>
      </PageLayout>
    );
  }

  if (!summary) {
    return (
      <PageLayout title="Return / Exchange" back={back}>
        <div className="py-16 text-center text-sm text-[var(--text-muted)]">
          Order summary could not be loaded.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Return / Exchange for Receipt #${summary.receiptNumber}`}
      description={`Original sale total ${format(currency, summary.totalAmount)} from ${new Date(summary.createdAt).toLocaleString()}`}
      back={back}
      action={
        <div className="rounded-2xl border border-[var(--border-glass)] bg-white px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Net Balance</p>
          <p
            className={`text-2xl font-black ${
              parseFloat(netAmount) > 0
                ? 'text-emerald-600'
                : parseFloat(netAmount) < 0
                  ? 'text-rose-600'
                  : 'text-[var(--text-primary)]'
            }`}
          >
            {format(currency, netAmount)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {parseFloat(netAmount) > 0
              ? 'Collect from customer'
              : parseFloat(netAmount) < 0
                ? 'Refund to customer'
                : 'Balanced exchange'}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <div className="space-y-6">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-[var(--border-glass)] px-5 py-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Returned Items</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Choose how many units are coming back.
                </p>
              </div>
              <div className="space-y-3 p-5">
                {summary.items.map((item) => {
                  const selectedQuantity = returnQuantities[item.orderItemId] ?? 0;
                  const restock = restockFlags[item.orderItemId] ?? false;
                  return (
                    <div
                      key={item.orderItemId}
                      className="rounded-2xl border border-[var(--border-glass)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {item.variantSku ?? '-'} / {item.barcode ?? 'No barcode'}
                          </p>
                        </div>
                        <Badge
                          variant={item.remainingReturnableQuantity > 0 ? 'info' : 'default'}
                        >
                          {item.remainingReturnableQuantity} returnable
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-[var(--text-secondary)]">
                          Sold:{' '}
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.soldQuantity}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-[var(--text-secondary)]">
                          Returned:{' '}
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.returnedQuantity}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-[var(--text-secondary)]">
                          Refund/unit:{' '}
                          <span className="font-semibold text-[var(--text-primary)]">
                            {format(currency, item.effectiveUnitRefund ?? item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setReturnQuantity(
                                item.orderItemId,
                                selectedQuantity - 1,
                                item.remainingReturnableQuantity,
                              )
                            }
                            className="rounded-lg p-2 text-slate-600 hover:bg-white"
                            disabled={item.remainingReturnableQuantity === 0}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={item.remainingReturnableQuantity}
                            value={selectedQuantity}
                            onChange={(event) =>
                              setReturnQuantity(
                                item.orderItemId,
                                Number(event.target.value),
                                item.remainingReturnableQuantity,
                              )
                            }
                            className="w-16 border-0 bg-transparent text-center text-sm font-semibold text-[var(--text-primary)] outline-none"
                            disabled={item.remainingReturnableQuantity === 0}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setReturnQuantity(
                                item.orderItemId,
                                selectedQuantity + 1,
                                item.remainingReturnableQuantity,
                              )
                            }
                            className="rounded-lg p-2 text-slate-600 hover:bg-white"
                            disabled={item.remainingReturnableQuantity === 0}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-rose-600">
                          -
                          {format(
                            currency,
                            (
                              toNumber(item.effectiveUnitRefund ?? item.unitPrice) *
                              selectedQuantity
                            ).toFixed(2),
                          )}
                        </p>
                      </div>

                      {selectedQuantity > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRestock(item.orderItemId)}
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                              restock
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {restock && (
                              <svg
                                viewBox="0 0 10 8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-3 w-3"
                              >
                                <path d="M1 4l3 3L9 1" />
                              </svg>
                            )}
                          </button>
                          <label className="text-xs font-medium text-slate-600">
                            Restock this item (add back to inventory)
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Adjustment Summary
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Returned Items</span>
                  <span className="font-semibold text-rose-600">
                    -{format(currency, returnedTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>New Sale Items</span>
                  <span className="font-semibold text-emerald-600">
                    +{format(currency, newSaleTotal)}
                  </span>
                </div>
                <div className="border-t border-dashed border-[var(--border-glass)] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">Net Balance</span>
                    <span
                      className={`text-xl font-black ${
                        parseFloat(netAmount) > 0
                          ? 'text-emerald-600'
                          : parseFloat(netAmount) < 0
                            ? 'text-rose-600'
                            : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {format(currency, netAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[PaymentMethod.CASH, PaymentMethod.DEBIT_CARD, PaymentMethod.OTHER].map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          paymentMethod === method
                            ? 'border-[var(--accent)] bg-orange-50 text-[var(--accent)]'
                            : 'border-[var(--border-glass)] text-[var(--text-secondary)] hover:border-slate-300'
                        }`}
                      >
                        {method.replace(/_/g, ' ')}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {parseFloat(netAmount) !== 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="adj-amount-paid"
                      className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                    >
                      Amount{' '}
                      {parseFloat(netAmount) > 0 ? 'Collected' : 'Refunded'}
                    </label>
                    <input
                      id="adj-amount-paid"
                      type="text"
                      inputMode="decimal"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={Math.abs(parseFloat(netAmount)).toFixed(2)}
                      className="flex-1 rounded-xl border border-[var(--border-glass)] px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  {paymentMethod === PaymentMethod.CASH && amountPaid && parseFloat(netAmount) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Change Due</span>
                      <span className="font-semibold text-emerald-600">
                        {format(currency, changeDue)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 space-y-2">
                <label
                  htmlFor="adjustment-notes"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                >
                  Notes
                </label>
                <textarea
                  id="adjustment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[var(--border-glass)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  placeholder="Optional notes about the return or exchange"
                />
              </div>

              <Button onClick={handleSubmit} isLoading={submitting} className="mt-5 w-full rounded-xl">
                Finalize Adjustment
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-[var(--border-glass)] px-5 py-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Replacement / New Items
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Add products the customer is taking now.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <Input
                  placeholder="Search by name, SKU, or barcode..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  icon={<Search size={16} />}
                  id="adjust-search"
                />

                <BarcodeScanInput
                  placeholder="Scan barcode to add to the new sale…"
                  products={products}
                  onScan={({ product, variant }) => {
                    addToCart(product, variant);
                  }}
                />

                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                      selectedCategory === 'all'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-slate-100 text-[var(--text-secondary)]'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                        selectedCategory === category.id
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-slate-100 text-[var(--text-secondary)]'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                <div className="max-h-[30rem] space-y-2 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const activeVariants = getActiveVariants(product);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProductToCart(product)}
                        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-white px-4 py-3 text-left transition hover:border-slate-300"
                      >
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{product.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {activeVariants.map((v) => v.name).join(', ')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {format(currency, activeVariants[0]?.price ?? '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Sale Cart</h2>
              {cart.items.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">No new items added yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.variantId}
                      className="rounded-2xl border border-[var(--border-glass)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {item.variantName} / base {format(currency, item.unitPrice)}
                          </p>
                          {item.attributeChips.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.attributeChips.map((chip) => (
                                <span
                                  key={chip.attributeName}
                                  className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
                                >
                                  {chip.attributeName}: {chip.value}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.discounts.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.discounts.map((d, i) => {
                                const isAuto = !!(
                                  d.discountId && cart.autoAppliedIds.has(d.discountId)
                                );
                                return (
                                  <span
                                    key={`${d.discountId ?? d.name}-${i}`}
                                    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                      isAuto
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                    title={isAuto ? 'Auto-applied (active discount)' : undefined}
                                  >
                                    {isAuto && <span className="opacity-70">auto:</span>}
                                    {d.name}{' '}
                                    {d.type === DiscountType.PERCENTAGE
                                      ? `(${d.value}%)`
                                      : `(−${d.value})`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {toNumber(item.runningTotals.lineDiscount) > 0 && (
                            <p className="mt-1 text-[10px] text-emerald-600">
                              −{format(currency, item.runningTotals.lineDiscount)} discount
                            </p>
                          )}
                          {toNumber(item.runningTotals.lineTax) > 0 && (
                            <p className="text-[10px] text-slate-400">
                              +{format(currency, item.runningTotals.lineTax)} tax
                              {item.taxRatePercent !== '0' ? ` (${item.taxRatePercent}%)` : ''}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => cart.removeItem(item.variantId)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, -1)}
                            className="rounded-lg p-2 hover:bg-white"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, 1)}
                            className="rounded-lg p-2 hover:bg-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right text-sm font-semibold text-emerald-600">
                          +{format(currency, item.runningTotals.lineNet)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VariantPicker
        product={variantPickerProduct}
        onClose={() => setVariantPickerProduct(null)}
        onSelect={addToCart}
      />
    </PageLayout>
  );
}
