import { prisma } from "./db";

/**
 * Any uploaded document with an image mime type counts as a product picture,
 * whichever category it was filed under. The earliest upload wins as the main
 * picture, so it stays stable when more photos are added later.
 */
export async function getProductImageMap(productIds: number[]): Promise<Record<number, number>> {
  if (productIds.length === 0) return {};
  const docs = await prisma.productDocument.findMany({
    where: { productId: { in: productIds }, mimeType: { startsWith: "image/" } },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, productId: true },
  });
  const map: Record<number, number> = {};
  for (const d of docs) {
    if (map[d.productId] === undefined) map[d.productId] = d.id;
  }
  return map;
}

export function isImage(mimeType: string | undefined): boolean {
  return (mimeType ?? "").startsWith("image/");
}
