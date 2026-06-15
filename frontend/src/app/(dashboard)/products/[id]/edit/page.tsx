'use client';

import { use } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import ProductForm from '@/components/products/ProductForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useProductQuery } from '@/hooks/products/useProductQuery';
import WriteGuard from '@/components/auth/WriteGuard';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProductQuery(id);

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <PageLayout title="Edit Product">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  } else if (error || !product) {
    content = (
      <PageLayout title="Edit Product">
        <div className="flex items-center justify-center py-20 text-slate-400">
          Product not found.
        </div>
      </PageLayout>
    );
  } else {
    content = (
      <PageLayout
        title={`Edit ${product.name}`}
        description="Update product details"
      >
        <ProductForm product={product} />
      </PageLayout>
    );
  }

  return <WriteGuard>{content}</WriteGuard>;
}
