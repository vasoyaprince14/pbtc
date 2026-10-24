import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductForm from "../ProductForm";
import ProductDocuments from "./ProductDocuments";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!product) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Product</h1>
      <ProductForm product={product} />
      <div className="mt-6">
        <ProductDocuments productId={product.id} initial={product.documents} />
      </div>
    </div>
  );
}
