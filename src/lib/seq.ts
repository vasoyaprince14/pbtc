import { prisma } from "./db";

function fyPrefix(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = m >= 3 ? y : y - 1;
  const end = start + 1;
  return `${String(start).slice(2)}-${String(end).slice(2)}`;
}

export async function nextInvoiceNo(date: Date = new Date()): Promise<string> {
  const s = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const prefix = s?.invoicePrefix ?? "INV";
  const fy = fyPrefix(date);
  const like = `${prefix}/${fy}/`;
  const last = await prisma.sale.findFirst({
    where: { invoiceNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { invoiceNo: true },
  });
  const lastN = last ? parseInt(last.invoiceNo.split("/").pop() || "0", 10) : 0;
  const next = lastN + 1;
  return `${like}${String(next).padStart(4, "0")}`;
}

export async function nextChallanNo(date: Date = new Date()): Promise<string> {
  const s = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const prefix = s?.challanPrefix ?? "DC";
  const fy = fyPrefix(date);
  const like = `${prefix}/${fy}/`;
  const last = await prisma.challan.findFirst({
    where: { challanNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { challanNo: true },
  });
  const lastN = last ? parseInt(last.challanNo.split("/").pop() || "0", 10) : 0;
  return `${like}${String(lastN + 1).padStart(4, "0")}`;
}

export async function nextPurchaseBillNo(date: Date = new Date()): Promise<string> {
  const fy = fyPrefix(date);
  const like = `PUR/${fy}/`;
  const last = await prisma.purchase.findFirst({
    where: { billNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { billNo: true },
  });
  const lastN = last ? parseInt(last.billNo.split("/").pop() || "0", 10) : 0;
  return `${like}${String(lastN + 1).padStart(4, "0")}`;
}

export async function nextQuotationNo(date: Date = new Date()): Promise<string> {
  const fy = fyPrefix(date);
  const like = `QT/${fy}/`;
  const last = await prisma.quotation.findFirst({
    where: { quotationNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { quotationNo: true },
  });
  const lastN = last ? parseInt(last.quotationNo.split("/").pop() || "0", 10) : 0;
  return `${like}${String(lastN + 1).padStart(4, "0")}`;
}

export async function nextSalesOrderNo(date: Date = new Date()): Promise<string> {
  const fy = fyPrefix(date);
  const like = `SO/${fy}/`;
  const last = await prisma.salesOrder.findFirst({
    where: { soNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { soNo: true },
  });
  const lastN = last ? parseInt(last.soNo.split("/").pop() || "0", 10) : 0;
  return `${like}${String(lastN + 1).padStart(4, "0")}`;
}

export async function nextJobCardNo(date: Date = new Date()): Promise<string> {
  const fy = fyPrefix(date);
  const like = `JC/${fy}/`;
  const last = await prisma.jobCard.findFirst({
    where: { cardNo: { startsWith: like } },
    orderBy: { id: "desc" },
    select: { cardNo: true },
  });
  const lastN = last ? parseInt(last.cardNo.split("/").pop() || "0", 10) : 0;
  return `${like}${String(lastN + 1).padStart(4, "0")}`;
}
