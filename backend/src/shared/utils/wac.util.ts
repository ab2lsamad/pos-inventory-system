import { Prisma } from '@prisma/client';
import { toDecimal } from './decimal.util';

interface WacInput {
  variantId: string;
  quantityReceived: number;
  unitCost: Prisma.Decimal | number | string;
}

/**
 * Recomputes ProductVariant.cost using moving weighted average on receipt.
 *
 * Why: a PO line's unitCost is the actual paid price for this shipment, but
 * COGS on sales reads from ProductVariant.cost. Without this, overrides on
 * the PO never flow into margin reports. WAC blends the new lot into the
 * existing on-hand value:
 *
 *   newCost = (onHand * oldCost + received * unitCost) / (onHand + received)
 *
 * On-hand is summed across all stores because cost is variant-global. Must
 * be called BEFORE adjustStock so on-hand reflects pre-receive state.
 */
export async function recomputeWeightedAverageCost(
  tx: Prisma.TransactionClient,
  input: WacInput,
): Promise<void> {
  const variant = await tx.productVariant.findUnique({
    where: { id: input.variantId },
    select: { cost: true },
  });
  if (!variant) return;

  const onHand = await tx.inventoryLevel.aggregate({
    where: { variantId: input.variantId },
    _sum: { quantity: true },
  });
  const qtyOnHand = onHand._sum.quantity ?? 0;
  const qtyReceived = input.quantityReceived;
  const unitCost = toDecimal(input.unitCost);

  const newCost =
    qtyOnHand <= 0
      ? unitCost
      : toDecimal(variant.cost)
          .mul(qtyOnHand)
          .add(unitCost.mul(qtyReceived))
          .div(qtyOnHand + qtyReceived);

  await tx.productVariant.update({
    where: { id: input.variantId },
    data: { cost: newCost.toDecimalPlaces(2) },
  });
}
