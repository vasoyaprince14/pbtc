import { prisma } from "./db";

export async function getStockOnHand(productId: number): Promise<number> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return 0;
  const agg = await prisma.stockMovement.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return (product.openingStock ?? 0) + (agg._sum.quantity ?? 0);
}

export async function getStockMap(productIds: number[]): Promise<Record<number, number>> {
  if (productIds.length === 0) return {};
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, openingStock: true },
  });
  const opening: Record<number, number> = {};
  for (const p of products) opening[p.id] = p.openingStock ?? 0;

  const moves = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _sum: { quantity: true },
  });
  const result: Record<number, number> = { ...opening };
  for (const m of moves) {
    result[m.productId] = (result[m.productId] ?? 0) + (m._sum.quantity ?? 0);
  }
  return result;
}
