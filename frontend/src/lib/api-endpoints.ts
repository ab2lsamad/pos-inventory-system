function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

type ListExtra = Record<string, string | number | boolean | undefined | null>;

const list = (root: string) => (page: number, limit: number, extra?: ListExtra) =>
  `${root}${buildQuery({ page, limit, ...(extra ?? {}) })}`;

type ReportParams = {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  all?: boolean;
};

const report = (path: string) => (params?: ReportParams) =>
  `/reports/${path}${buildQuery({ ...(params ?? {}) })}`;

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
  },
  users: {
    root: '/users',
    list: list('/users'),
    byId: (id: string) => `/users/${id}`,
    me: '/users/me',
    salespeople: (storeId?: string) =>
      `/users/salespeople${buildQuery({ storeId })}`,
  },
  stores: {
    root: '/stores',
    list: list('/stores'),
    byId: (id: string) => `/stores/${id}`,
    archive: (id: string) => `/stores/${id}/archive`,
  },
  categories: {
    root: '/categories',
    list: list('/categories'),
    byId: (id: string) => `/categories/${id}`,
    archive: (id: string) => `/categories/${id}/archive`,
  },
  brands: {
    root: '/brands',
    list: list('/brands'),
    byId: (id: string) => `/brands/${id}`,
    archive: (id: string) => `/brands/${id}/archive`,
  },
  products: {
    root: '/products',
    list: list('/products'),
    byId: (id: string) => `/products/${id}`,
    byBarcode: (barcode: string) =>
      `/products/barcode/${encodeURIComponent(barcode)}`,
    generateBarcodes: (count: number) =>
      `/products/barcodes/generate?count=${count}`,
    archive: (id: string) => `/products/${id}/archive`,
    variants: (id: string) => `/products/${id}/variants`,
    variantById: (productId: string, variantId: string) =>
      `/products/${productId}/variants/${variantId}`,
    variantUpdate: (variantId: string) => `/products/variants/${variantId}`,
    variantDeactivate: (variantId: string) =>
      `/products/variants/${variantId}/deactivate`,
  },
  attributes: {
    root: '/attributes',
    list: list('/attributes'),
    byId: (id: string) => `/attributes/${id}`,
    reorder: '/attributes/reorder',
    addValue: (attributeId: string) => `/attributes/${attributeId}/values`,
    valueById: (valueId: string) => `/attributes/values/${valueId}`,
    reorderValues: (attributeId: string) =>
      `/attributes/${attributeId}/values/reorder`,
  },
  taxRates: {
    root: '/tax-rates',
    list: list('/tax-rates'),
    byId: (id: string) => `/tax-rates/${id}`,
  },
  discounts: {
    root: '/discounts',
    list: list('/discounts'),
    byId: (id: string) => `/discounts/${id}`,
  },
  customers: {
    root: '/customers',
    list: list('/customers'),
    byId: (id: string) => `/customers/${id}`,
  },
  suppliers: {
    root: '/suppliers',
    list: list('/suppliers'),
    byId: (id: string) => `/suppliers/${id}`,
    products: (supplierId: string) => `/suppliers/${supplierId}/products`,
    productById: (supplierId: string, variantId: string) =>
      `/suppliers/${supplierId}/products/${variantId}`,
  },
  purchaseOrders: {
    root: '/purchase-orders',
    list: list('/purchase-orders'),
    byId: (id: string) => `/purchase-orders/${id}`,
    submit: (id: string) => `/purchase-orders/${id}/submit`,
    receive: (id: string) => `/purchase-orders/${id}/receive`,
    cancel: (id: string) => `/purchase-orders/${id}/cancel`,
  },
  transfers: {
    root: '/transfers',
    list: list('/transfers'),
    byId: (id: string) => `/transfers/${id}`,
    ship: (id: string) => `/transfers/${id}/ship`,
    receive: (id: string) => `/transfers/${id}/receive`,
    cancel: (id: string) => `/transfers/${id}/cancel`,
  },
  inventory: {
    levels: '/inventory/levels',
    levelsList: (params: {
      page?: number;
      limit?: number;
      storeId?: string;
      search?: string;
      // Comma-separated category IDs (filters by variant.product.categoryId).
      categoryIds?: string;
      lowStockOnly?: boolean;
    }) => `/inventory/levels${buildQuery(params)}`,
    movements: '/inventory/movements',
    adjust: '/inventory/adjust',
    count: '/inventory/count',
    setReorder: '/inventory/levels',
  },
  orders: {
    root: '/orders',
    list: list('/orders'),
    stats: (params?: { storeId?: string; from?: string; to?: string }) =>
      `/orders/stats/summary${buildQuery({ ...(params ?? {}) })}`,
    byId: (id: string) => `/orders/${id}`,
    returnSummary: (id: string) => `/orders/${id}/return-summary`,
    adjustments: (id: string) => `/orders/${id}/adjustments`,
    adjustmentById: (adjustmentId: string) =>
      `/orders/adjustments/${adjustmentId}`,
  },
  compensation: {
    summary: (periodStart: string, periodEnd: string, storeId?: string) =>
      `/compensation/summary${buildQuery({ periodStart, periodEnd, storeId })}`,
    userDetail: (
      id: string,
      periodStart: string,
      periodEnd: string,
      storeId?: string,
    ) =>
      `/compensation/users/${id}${buildQuery({
        periodStart,
        periodEnd,
        storeId,
      })}`,
    payouts: (params?: {
      userId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => `/compensation/payouts${buildQuery(params ?? {})}`,
    payoutById: (id: string) => `/compensation/payouts/${id}`,
  },
  reports: {
    summary: report('summary'),
    salesCount: report('sales-count'),
    productSales: report('product-sales'),
    categorySales: report('category-sales'),
    supplierSales: report('supplier-sales'),
    currentStock: report('current-stock'),
    storeSales: report('store-sales'),
    userSales: report('user-sales'),
    taxBreakdown: report('tax-breakdown'),
  },
} as const;
