'use client';

import { useMemo, useState } from 'react';
import { ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { computeChangeDue, splitDiscountAmounts } from '@/lib/pos-engine';
import { parseApiError } from '@/lib/api-utils';
import { useAuthStore } from '@/store/auth-store';
import { useCart } from '@/hooks/pos/useCart';
import { useCheckout } from '@/hooks/pos/useCheckout';
import { usePosProductSearch } from '@/hooks/pos/usePosProductSearch';
import { useSalespeople, type Salesperson } from '@/hooks/pos/useSalespeople';
import { useCategoriesQuery } from '@/hooks/categories/useCategoriesQuery';
import { useDiscountsList } from '@/hooks/settings/useDiscountsList';
import { printReceipt, type ReceiptSnapshot } from '@/lib/print-receipt';
import { add, toNumber } from '@/lib/money';
import type { Discount } from '@/types/discount';
import ProductGrid from '@/components/pos/ProductGrid';
import CartPanel from '@/components/pos/CartPanel';
import VariantPicker from '@/components/pos/VariantPicker';
import type { Product, ProductVariant } from '@/types/product';
import type { Customer } from '@/types/customer';
import { PaymentMethod } from '@/types/shared';

const getActiveVariants = (product: Product) => product.variants.filter((v) => v.isActive);

// Auto-apply only when the discount has an explicit date window AND the
// current time falls inside it. Discounts with no startsAt/endsAt are not
// auto-applied — they must be picked manually from the catalog.
function isEligibleNow(d: Discount): boolean {
  if (!d.isActive) return false;
  if (!d.startsAt && !d.endsAt) return false;
  const now = Date.now();
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return false;
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return false;
  if (d.maxUses != null && d.usageCount >= d.maxUses) return false;
  return true;
}

export default function POSPage() {
  const user = useAuthStore((s) => s.user);
  const checkout = useCheckout();

  const productsQuery = usePosProductSearch({ pageSize: 100 });
  const { data: categories } = useCategoriesQuery({ pageSize: 100 });
  const { data: allDiscounts } = useDiscountsList({ pageSize: 100, includeArchived: false });

  const autoApplyDiscounts = useMemo(
    () => allDiscounts.filter(isEligibleNow),
    [allDiscounts],
  );

  const cart = useCart({ autoApplyDiscounts });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountPaid, setAmountPaid] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [salesperson, setSalesperson] = useState<Salesperson | null>(null);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);

  const { data: salespeople = [] } = useSalespeople(
    user?.storeId ?? undefined,
    !!user?.storeId,
  );
  const [barcodeProducts, setBarcodeProducts] = useState<Product[]>([]);

  const loading = productsQuery.isLoading;
  const productsError = productsQuery.error
    ? parseApiError(productsQuery.error, 'Failed to load products')
    : null;

  const fetched = productsQuery.products;
  const products = (() => {
    if (barcodeProducts.length === 0) return fetched;
    const ids = new Set(fetched.map((p) => p.id));
    const extra = barcodeProducts.filter((p) => !ids.has(p.id));
    return [...extra, ...fetched];
  })();

  const addVariantToCart = (product: Product, variant: ProductVariant) => {
    const existing = cart.items.find((item) => item.variantId === variant.id);
    if (existing) {
      cart.updateQuantity(variant.id, existing.quantity + 1);
      return;
    }
    cart.addLine({ product, variant, quantity: 1 });
  };

  const handleSelectProduct = (product: Product) => {
    const activeVariants = getActiveVariants(product);
    if (activeVariants.length === 0) {
      toast.error('No active variants available for this product');
      return;
    }
    if (activeVariants.length === 1) {
      addVariantToCart(product, activeVariants[0]);
      return;
    }
    setVariantPickerProduct(product);
  };

  const handleAddProductFromBarcode = (product: Product) => {
    setBarcodeProducts((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex === -1) return [product, ...prev];
      const next = [...prev];
      next[existingIndex] = product;
      return next;
    });
  };

  const clearCart = () => {
    cart.clear();
    setAmountPaid('');
    setCustomer(null);
    setSalesperson(null);
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === PaymentMethod.CASH) {
      setAmountPaid(cart.grandTotal);
    } else {
      setAmountPaid(cart.grandTotal);
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!user?.storeId) {
      toast.error('User is not assigned to a store');
      return;
    }

    const grandTotal = cart.grandTotal;
    const paid = amountPaid || grandTotal;
    const changeDue =
      paymentMethod === PaymentMethod.CASH
        ? computeChangeDue(grandTotal, paid)
        : '0.00';

    const paidNum = parseFloat(paid);
    const totalNum = parseFloat(grandTotal);

    if (paymentMethod === PaymentMethod.CASH && paidNum < totalNum) {
      toast.error('Amount paid is less than the grand total');
      return;
    }

    if (paymentMethod !== PaymentMethod.CASH && Math.abs(paidNum - totalNum) > 0.01) {
      toast.error('Non-cash payment must equal the exact total');
      return;
    }

    const itemsPayload = cart.items.map((line) => {
      const amounts = splitDiscountAmounts(line.runningTotals.lineGross, line.discounts);
      const discounts = line.discounts
        .map((d, i) => ({
          discountId: d.discountId,
          description: d.name,
          amount: amounts[i],
        }))
        .filter((d) => d.amount > 0);
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        discounts: discounts.length > 0 ? discounts : undefined,
      };
    });

    const orderDiscountBase = cart.items.reduce(
      (sum, l) =>
        (
          parseFloat(sum) + parseFloat(l.runningTotals.lineNet)
        ).toFixed(2),
      '0.00',
    );
    const orderDiscountAmounts = splitDiscountAmounts(
      orderDiscountBase,
      cart.effectiveOrderDiscounts,
    );
    const orderDiscountsPayload = cart.effectiveOrderDiscounts
      .map((d, i) => ({
        discountId: d.discountId,
        description: d.name,
        amount: orderDiscountAmounts[i],
      }))
      .filter((d) => d.amount > 0);

    try {
      const order = await checkout.mutateAsync({
        storeId: user.storeId,
        paymentMethod,
        amountPaid: parseFloat(paid),
        customerId: customer?.id,
        salespersonId: salesperson?.id,
        items: itemsPayload,
        discounts: orderDiscountsPayload.length > 0 ? orderDiscountsPayload : undefined,
      });

      const subtotal = cart.items.reduce(
        (sum, l) => add(sum, l.runningTotals.lineGross),
        '0.00',
      );
      const totalLineDiscount = cart.items.reduce(
        (sum, l) => add(sum, l.runningTotals.lineDiscount),
        '0.00',
      );
      const totalTax = cart.items.reduce(
        (sum, l) => add(sum, l.runningTotals.lineTax),
        '0.00',
      );
      const totalOrderDiscount = Math.max(
        toNumber(subtotal) -
          toNumber(totalLineDiscount) +
          toNumber(totalTax) -
          toNumber(grandTotal),
        0,
      ).toFixed(2);

      const snapshot: ReceiptSnapshot = {
        receiptNumber: order.receiptNumber,
        orderId: order.id,
        createdAt: order.createdAt,
        currency: order.currency,
        storeName: order.store?.name,
        storeLocation: order.store?.location,
        storePhone: order.store?.phone,
        cashierName: order.cashier?.fullName || order.cashier?.email,
        salespersonName: salesperson?.fullName || salesperson?.email,
        customer,
        paymentMethod,
        items: cart.items,
        orderDiscounts: cart.effectiveOrderDiscounts,
        subtotal,
        totalLineDiscount,
        totalTax,
        totalOrderDiscount,
        grandTotal,
        amountPaid: paid,
        changeGiven: changeDue,
      };

      const printed = printReceipt(snapshot);
      if (!printed) {
        toast.error('Popup blocked — allow popups to print receipts');
      }

      toast.success(`Sale completed — receipt #${order.receiptNumber}`);
      clearCart();
    } catch {
      // error toast handled by hook
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <ScanLine className="h-10 w-10 animate-pulse" />
          <p className="font-semibold tracking-wide">INITIALIZING TERMINAL...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white lg:max-h-[calc(100vh-2.5rem)]">
          <CartPanel
            cart={cart}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            amountPaid={amountPaid || cart.grandTotal}
            onAmountPaidChange={setAmountPaid}
            customer={customer}
            onCustomerChange={setCustomer}
            salespeople={salespeople}
            salesperson={salesperson}
            onSalespersonChange={setSalesperson}
            products={products}
            onAddVariant={addVariantToCart}
            onAddProductFromBarcode={handleAddProductFromBarcode}
            onClear={clearCart}
            onCheckout={handleCheckout}
            isCheckingOut={checkout.isPending}
          />
        </div>

        <div className="glass-panel flex min-h-0 w-full flex-col overflow-hidden lg:max-h-[calc(100vh-2.5rem)] lg:w-[420px] lg:flex-shrink-0">
          <ProductGrid
            products={products}
            categories={categories}
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
            error={productsError}
            onSelectProduct={handleSelectProduct}
          />
        </div>
      </div>

      <VariantPicker
        product={variantPickerProduct}
        onClose={() => setVariantPickerProduct(null)}
        onSelect={addVariantToCart}
      />
    </>
  );
}
