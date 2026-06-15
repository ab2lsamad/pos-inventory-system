'use client';

import { useParams } from 'next/navigation';
import OrderAdjustForm from '@/components/orders/OrderAdjustForm';

export default function OrderAdjustmentPage() {
  const { id } = useParams<{ id: string }>();
  return <OrderAdjustForm orderId={id} />;
}
