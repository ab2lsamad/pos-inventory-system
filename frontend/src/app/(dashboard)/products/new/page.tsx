'use client';

import PageLayout from '@/components/layout/PageLayout';
import ProductForm from '@/components/products/ProductForm';
import WriteGuard from '@/components/auth/WriteGuard';

export default function NewProductPage() {
  return (
    <WriteGuard>
      <PageLayout
        title="New Product"
        description="Add a simple or variable product to your catalog"
      >
        <ProductForm product={null} />
      </PageLayout>
    </WriteGuard>
  );
}
