import { prisma } from "@/lib/db";
import { nextInvoiceNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import SaleForm from "../SaleForm";

export const dynamic = "force-dynamic";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams?: { soId?: string };
}) {
  const soIdRaw = searchParams?.soId;
  const soId = soIdRaw ? Number(soIdRaw) : null;

  const [customers, products, settings, invoiceNo] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
    nextInvoiceNo(),
  ]);

  let preloadedItems: any[] = [];
  let preloadedCustomerId = 0;
  let preloadedSalesOrderId: number | null = null;

  if (soId && Number.isFinite(soId)) {
    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { items: { include: { product: true, saleItems: true } } },
    });
    if (so) {
      preloadedCustomerId = so.customerId;
      preloadedSalesOrderId = so.id;
      preloadedItems = so.items
        .map((soi) => {
          const delivered = soi.saleItems.reduce((a, s) => a + s.quantity, 0);
          const remaining = Math.max(0, soi.orderedQty - delivered);
          return { soi, remaining };
        })
        .filter(({ remaining }) => remaining > 0.0001)
        .map(({ soi, remaining }) => ({
          productId: soi.productId,
          hsnCode: soi.hsnCode,
          quantity: remaining,
          rate: soi.rate,
          discount: 0,
          gstRate: soi.gstRate,
          unit: soi.product.unit,
          productName: soi.product.name,
          salesOrderItemId: soi.id,
        }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        New Sale Invoice
        {preloadedSalesOrderId && <span className="ml-3 text-sm text-blue-700 font-normal">(dispatching against SO)</span>}
      </h1>
      <SaleForm
        customers={customers}
        products={products}
        shopStateCode={settings?.stateCode ?? "06"}
        initial={{
          invoiceNo,
          invoiceDate: toDateInput(new Date()),
          customerId: preloadedCustomerId,
          items: preloadedItems,
          discount: 0,
          vehicleNo: "",
          transporter: "",
          transporterGstin: "",
          distanceKm: null,
          ewayBillNo: "",
          dispatchAddress: "",
          notes: "",
          paidAmount: 0,
          salesOrderId: preloadedSalesOrderId,
        }}
      />
    </div>
  );
}
