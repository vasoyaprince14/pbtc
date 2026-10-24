/**
 * Demo seed — wipes the DB and fills it with realistic sample data.
 *
 * Used for the public demo deployment so every screen and report has
 * something to show. NEVER run this against the real shop database.
 *
 *   node prisma/seed-demo.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SHOP_STATE = "06"; // Haryana

const round2 = (n) => Math.round(n * 100) / 100;

function calcLineTax({ quantity, rate, discount = 0, gstRate }, isInterState) {
  const taxable = Math.max(0, quantity * rate - discount);
  const gstAmt = (taxable * gstRate) / 100;
  if (isInterState) {
    return { taxable: round2(taxable), cgstAmt: 0, sgstAmt: 0, igstAmt: round2(gstAmt), total: round2(taxable + gstAmt) };
  }
  const half = gstAmt / 2;
  return { taxable: round2(taxable), cgstAmt: round2(half), sgstAmt: round2(half), igstAmt: 0, total: round2(taxable + gstAmt) };
}

function sumTotals(lines) {
  const t = lines.reduce(
    (a, l) => ({
      subTotal: a.subTotal + l.taxable,
      cgstTotal: a.cgstTotal + l.cgstAmt,
      sgstTotal: a.sgstTotal + l.sgstAmt,
      igstTotal: a.igstTotal + l.igstAmt,
      grandTotal: a.grandTotal + l.total,
    }),
    { subTotal: 0, cgstTotal: 0, sgstTotal: 0, igstTotal: 0, grandTotal: 0 }
  );
  const rounded = Math.round(t.grandTotal);
  return {
    subTotal: round2(t.subTotal),
    cgstTotal: round2(t.cgstTotal),
    sgstTotal: round2(t.sgstTotal),
    igstTotal: round2(t.igstTotal),
    grandTotal: rounded,
    roundOff: round2(rounded - t.grandTotal),
  };
}

/** Financial-year label used by src/lib/seq.ts — Apr..Mar */
function fyPrefix(date) {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

const TODAY = new Date();
TODAY.setHours(11, 0, 0, 0);
/** n days before today */
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
};
const FY = fyPrefix(TODAY);

async function wipe() {
  // children first — FK order matters
  await prisma.jobCardStage.deleteMany();
  await prisma.jobCard.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
}

const PRODUCTS = [
  { sku: "BRS-HNG-01", name: "Brass Microscope Hinge Bracket", hsnCode: "9011", category: "Microscope Parts", unit: "PCS", gstRate: 18, purchasePrice: 142, salePrice: 215, rack: "A-1", openingStock: 180, minStock: 40 },
  { sku: "BRS-KNB-02", name: "Brass Focus Knob 25mm", hsnCode: "9011", category: "Microscope Parts", unit: "PCS", gstRate: 18, purchasePrice: 68, salePrice: 110, rack: "A-2", openingStock: 320, minStock: 80 },
  // minStock on TUB-03 / BSE-07 / WGT-12 sits above on-hand on purpose, so the
  // low-stock alerts have something to show in the demo.
  { sku: "BRS-TUB-03", name: "Brass Telescope Tube 50mm", hsnCode: "9005", category: "Optical Parts", unit: "PCS", gstRate: 18, purchasePrice: 410, salePrice: 625, rack: "A-3", openingStock: 64, minStock: 120 },
  { sku: "BRS-STP-04", name: "Brass Stopcock 8mm Bore", hsnCode: "7419", category: "Lab Glassware Fittings", unit: "PCS", gstRate: 18, purchasePrice: 95, salePrice: 148, rack: "B-1", openingStock: 240, minStock: 60 },
  { sku: "BRS-CLP-05", name: "Brass Burette Clamp Double", hsnCode: "7419", category: "Lab Stands & Clamps", unit: "PCS", gstRate: 18, purchasePrice: 178, salePrice: 270, rack: "B-2", openingStock: 96, minStock: 30 },
  { sku: "BRS-RNG-06", name: "Brass Retort Ring 100mm", hsnCode: "7419", category: "Lab Stands & Clamps", unit: "PCS", gstRate: 18, purchasePrice: 120, salePrice: 185, rack: "B-3", openingStock: 150, minStock: 40 },
  { sku: "BRS-BSE-07", name: "Brass Stand Base 150x100mm", hsnCode: "9027", category: "Lab Stands & Clamps", unit: "PCS", gstRate: 18, purchasePrice: 540, salePrice: 820, rack: "B-4", openingStock: 42, minStock: 75 },
  { sku: "BRS-SCR-08", name: "Brass Thumb Screw M6x20", hsnCode: "7415", category: "Fasteners", unit: "PCS", gstRate: 18, purchasePrice: 11, salePrice: 19, rack: "C-1", openingStock: 1800, minStock: 400 },
  { sku: "BRS-FER-09", name: "Brass Ferrule 12mm", hsnCode: "7419", category: "Fittings", unit: "PCS", gstRate: 18, purchasePrice: 24, salePrice: 42, rack: "C-2", openingStock: 760, minStock: 200 },
  { sku: "BRS-NOZ-10", name: "Brass Spray Nozzle Fine", hsnCode: "7419", category: "Fittings", unit: "PCS", gstRate: 18, purchasePrice: 86, salePrice: 135, rack: "C-3", openingStock: 110, minStock: 30 },
  { sku: "BRS-ADP-11", name: "Brass Adapter Cone 19/26", hsnCode: "7020", category: "Lab Glassware Fittings", unit: "PCS", gstRate: 12, purchasePrice: 132, salePrice: 205, rack: "D-1", openingStock: 88, minStock: 25 },
  { sku: "BRS-WGT-12", name: "Brass Weight Set 1g-100g", hsnCode: "9016", category: "Weights & Measures", unit: "SET", gstRate: 18, purchasePrice: 760, salePrice: 1150, rack: "D-2", openingStock: 26, minStock: 50 },
  { sku: "BRS-PLT-13", name: "Brass Mounting Plate 60x40mm", hsnCode: "7419", category: "Fittings", unit: "PCS", gstRate: 18, purchasePrice: 58, salePrice: 95, rack: "D-3", openingStock: 410, minStock: 100 },
  { sku: "BRS-VLV-14", name: "Brass Needle Valve 6mm", hsnCode: "8481", category: "Fittings", unit: "PCS", gstRate: 18, purchasePrice: 265, salePrice: 395, rack: "D-4", openingStock: 54, minStock: 20 },
];

const CUSTOMERS = [
  { name: "Ambala Scientific Works", gstin: "06AABCA1234F1Z5", stateName: "Haryana", stateCode: "06", address: "Plot 44, Scientific Instruments Area", city: "Ambala Cantt", pincode: "133001", phone: "9812345601", creditDays: 30, openingBalance: 18500 },
  { name: "Hindustan Lab Equipments", gstin: "06AACCH5678K1Z2", stateName: "Haryana", stateCode: "06", address: "Industrial Estate, Phase 2", city: "Ambala", pincode: "134003", phone: "9812345602", creditDays: 45, openingBalance: 0 },
  { name: "Shri Ram Instruments", gstin: "06AADCS9012L1Z8", stateName: "Haryana", stateCode: "06", address: "Jagadhri Road", city: "Yamunanagar", pincode: "135001", phone: "9812345603", creditDays: 15, openingBalance: 7200 },
  { name: "Delhi Scientific Traders", gstin: "07AAECD3456M1Z4", stateName: "Delhi", stateCode: "07", address: "2145, Chandni Chowk", city: "New Delhi", pincode: "110006", phone: "9811234504", creditDays: 30, openingBalance: 0 },
  { name: "Mumbai Lab Supplies Pvt Ltd", gstin: "27AAFCM7890N1Z1", stateName: "Maharashtra", stateCode: "27", address: "Unit 7, MIDC Andheri East", city: "Mumbai", pincode: "400093", phone: "9820123405", creditDays: 60, openingBalance: 42000 },
  { name: "Kolkata Instruments Co.", gstin: "19AAGCK2345P1Z7", stateName: "West Bengal", stateCode: "19", address: "18 Bentinck Street", city: "Kolkata", pincode: "700001", phone: "9830123406", creditDays: 30, openingBalance: 0 },
];

const SUPPLIERS = [
  { name: "Jamnagar Brass Components", gstin: "24AAHCJ6789Q1Z3", stateName: "Gujarat", stateCode: "24", address: "GIDC Phase 1, Dared", city: "Jamnagar", pincode: "361004", phone: "9825123701", openingBalance: 0 },
  { name: "Rajkot Metal Works", gstin: "24AAJCR0123R1Z9", stateName: "Gujarat", stateCode: "24", address: "Bhaktinagar Station Road", city: "Rajkot", pincode: "360002", phone: "9825123702", openingBalance: 26400 },
  { name: "Delhi Brass House", gstin: "07AAKCD4567S1Z6", stateName: "Delhi", stateCode: "07", address: "Naya Bazar, Khari Baoli", city: "New Delhi", pincode: "110006", phone: "9811123703", openingBalance: 0 },
  { name: "Ambala Metal Traders", gstin: "06AALCA8901T1Z2", stateName: "Haryana", stateCode: "06", address: "Rai Market, Ambala City", city: "Ambala", pincode: "134002", phone: "9812123704", openingBalance: 9800 },
];

async function main() {
  console.log("Wiping existing data…");
  await wipe();

  // ---- Shop settings -------------------------------------------------
  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  await prisma.shopSettings.update({
    where: { id: 1 },
    data: {
      shopName: "Prince Brass Trading Co.",
      gstin: "06AAAPV1234C1ZX",
      stateName: "Haryana",
      stateCode: SHOP_STATE,
      address: "Shop 12, Brass Market, Sadar Bazar",
      city: "Ambala Cantt",
      pincode: "133001",
      phone: "9812300000",
      email: "sales@princebrass.example",
      invoicePrefix: "INV",
      challanPrefix: "DC",
      bankName: "State Bank of India",
      bankAccount: "33124567890",
      bankIfsc: "SBIN0000456",
      bankBranch: "Ambala Cantt",
      termsNote: "Goods once sold will not be taken back. Interest @18% p.a. on overdue payments.",
    },
  });

  // ---- Users ---------------------------------------------------------
  const hash = (pw) => bcrypt.hash(pw, 10);
  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: await hash("admin123"), name: "Prince Vasoya", role: "owner" },
      { username: "manager", passwordHash: await hash("manager123"), name: "Rakesh Kumar", role: "manager" },
      { username: "staff", passwordHash: await hash("staff123"), name: "Sunil Sharma", role: "staff" },
    ],
  });

  // ---- Masters -------------------------------------------------------
  for (const p of PRODUCTS) await prisma.product.create({ data: p });
  for (const c of CUSTOMERS) await prisma.customer.create({ data: c });
  for (const s of SUPPLIERS) await prisma.supplier.create({ data: s });

  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const customers = await prisma.customer.findMany({ orderBy: { id: "asc" } });
  const suppliers = await prisma.supplier.findMany({ orderBy: { id: "asc" } });
  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  // ---- Purchases (stock IN) -----------------------------------------
  const purchaseDefs = [
    { supplier: suppliers[0], daysAgo: 58, supplierBillNo: "JBC/2847", lines: [["BRS-HNG-01", 120, 138], ["BRS-KNB-02", 250, 65], ["BRS-SCR-08", 1500, 10.5]] },
    { supplier: suppliers[1], daysAgo: 44, supplierBillNo: "RMW-1192", lines: [["BRS-STP-04", 200, 92], ["BRS-FER-09", 600, 23], ["BRS-PLT-13", 300, 56]] },
    { supplier: suppliers[2], daysAgo: 31, supplierBillNo: "DBH/5521", lines: [["BRS-TUB-03", 60, 402], ["BRS-ADP-11", 80, 128]] },
    { supplier: suppliers[3], daysAgo: 19, supplierBillNo: "AMT-778", lines: [["BRS-CLP-05", 90, 172], ["BRS-RNG-06", 140, 116], ["BRS-NOZ-10", 100, 83]] },
    { supplier: suppliers[0], daysAgo: 8, supplierBillNo: "JBC/2913", lines: [["BRS-BSE-07", 40, 528], ["BRS-WGT-12", 24, 742], ["BRS-VLV-14", 50, 258]] },
  ];

  let purSeq = 0;
  for (const def of purchaseDefs) {
    const date = daysAgo(def.daysAgo);
    const inter = def.supplier.stateCode !== SHOP_STATE;
    const items = def.lines.map(([sku, qty, rate]) => {
      const p = bySku[sku];
      const tax = calcLineTax({ quantity: qty, rate, gstRate: p.gstRate }, inter);
      return { productId: p.id, hsnCode: p.hsnCode, quantity: qty, rate, discount: 0, gstRate: p.gstRate, ...tax };
    });
    const t = sumTotals(items);
    purSeq += 1;
    const purchase = await prisma.purchase.create({
      data: {
        billNo: `PUR/${FY}/${String(purSeq).padStart(4, "0")}`,
        supplierBillNo: def.supplierBillNo,
        billDate: date,
        supplierId: def.supplier.id,
        ...t,
        paidAmount: def.daysAgo > 25 ? t.grandTotal : 0,
        items: { create: items },
      },
    });
    for (const it of items) {
      await prisma.stockMovement.create({
        data: { productId: it.productId, type: "in", quantity: it.quantity, refType: "purchase", refId: purchase.id, refNo: purchase.billNo, costPrice: it.rate, movedAt: date, notes: "Purchase entry" },
      });
    }
  }

  // ---- Sales (stock OUT) --------------------------------------------
  const saleDefs = [
    { cust: 0, daysAgo: 52, lines: [["BRS-HNG-01", 25], ["BRS-KNB-02", 40]], paidFull: true },
    { cust: 3, daysAgo: 47, lines: [["BRS-STP-04", 50], ["BRS-FER-09", 120]], paidFull: true },
    { cust: 1, daysAgo: 41, lines: [["BRS-BSE-07", 8], ["BRS-CLP-05", 15]], paidFull: true },
    { cust: 4, daysAgo: 36, lines: [["BRS-WGT-12", 6], ["BRS-TUB-03", 10]], paidFull: false },
    { cust: 2, daysAgo: 30, lines: [["BRS-SCR-08", 400], ["BRS-PLT-13", 80]], paidFull: true },
    { cust: 0, daysAgo: 24, lines: [["BRS-RNG-06", 30], ["BRS-NOZ-10", 20]], paidFull: true },
    { cust: 5, daysAgo: 19, lines: [["BRS-ADP-11", 24], ["BRS-VLV-14", 12]], paidFull: false },
    { cust: 1, daysAgo: 14, lines: [["BRS-HNG-01", 18], ["BRS-TUB-03", 6]], paidFull: true },
    { cust: 3, daysAgo: 9, lines: [["BRS-FER-09", 150], ["BRS-SCR-08", 500]], paidFull: false },
    { cust: 0, daysAgo: 5, lines: [["BRS-KNB-02", 60], ["BRS-PLT-13", 45]], paidFull: true },
    { cust: 4, daysAgo: 2, lines: [["BRS-BSE-07", 5], ["BRS-CLP-05", 10], ["BRS-STP-04", 30]], paidFull: false },
    { cust: 2, daysAgo: 0, lines: [["BRS-NOZ-10", 15], ["BRS-VLV-14", 8]], paidFull: true },
  ];

  let invSeq = 0;
  const createdSales = [];
  for (const def of saleDefs) {
    const customer = customers[def.cust];
    const date = daysAgo(def.daysAgo);
    const inter = customer.stateCode !== SHOP_STATE;
    const items = def.lines.map(([sku, qty]) => {
      const p = bySku[sku];
      const tax = calcLineTax({ quantity: qty, rate: p.salePrice, gstRate: p.gstRate }, inter);
      return { productId: p.id, hsnCode: p.hsnCode, quantity: qty, rate: p.salePrice, discount: 0, gstRate: p.gstRate, costPrice: p.purchasePrice, ...tax };
    });
    const t = sumTotals(items);
    invSeq += 1;
    const sale = await prisma.sale.create({
      data: {
        invoiceNo: `INV/${FY}/${String(invSeq).padStart(4, "0")}`,
        invoiceDate: date,
        customerId: customer.id,
        isInterState: inter,
        ...t,
        paidAmount: def.paidFull ? t.grandTotal : 0,
        vehicleNo: inter ? "HR01AB" + (1000 + invSeq) : "",
        transporter: inter ? "Gati Logistics" : "",
        notes: "",
        items: { create: items },
      },
    });
    createdSales.push({ sale, customer, date, paidFull: def.paidFull });
    for (const it of items) {
      await prisma.stockMovement.create({
        data: { productId: it.productId, type: "out", quantity: -it.quantity, refType: "sale", refId: sale.id, refNo: sale.invoiceNo, costPrice: it.costPrice, movedAt: date, notes: "Sale invoice" },
      });
    }
  }

  // ---- Payments ------------------------------------------------------
  let payNo = 0;
  for (const { sale, customer, date, paidFull } of createdSales) {
    if (!paidFull) continue;
    payNo += 1;
    await prisma.payment.create({
      data: {
        type: "received",
        refNo: `RCP/${FY}/${String(payNo).padStart(4, "0")}`,
        paidOn: date,
        amount: sale.grandTotal,
        mode: payNo % 3 === 0 ? "Cash" : payNo % 3 === 1 ? "UPI" : "Bank Transfer",
        customerId: customer.id,
        notes: `Against ${sale.invoiceNo}`,
      },
    });
  }
  // partial payment against an unpaid inter-state invoice
  await prisma.payment.create({
    data: { type: "received", refNo: `RCP/${FY}/${String(payNo + 1).padStart(4, "0")}`, paidOn: daysAgo(12), amount: 25000, mode: "Bank Transfer", customerId: customers[4].id, notes: "Part payment on account" },
  });
  await prisma.payment.create({
    data: { type: "paid", refNo: `PAY/${FY}/0001`, paidOn: daysAgo(40), amount: 85000, mode: "Bank Transfer", supplierId: suppliers[0].id, notes: "Against JBC/2847" },
  });
  await prisma.payment.create({
    data: { type: "paid", refNo: `PAY/${FY}/0002`, paidOn: daysAgo(21), amount: 48000, mode: "Cheque", supplierId: suppliers[1].id, notes: "Against RMW-1192" },
  });

  // ---- Quotations ----------------------------------------------------
  const quoteDefs = [
    { cust: 1, daysAgo: 16, status: "sent", lines: [["BRS-BSE-07", 20], ["BRS-CLP-05", 40]] },
    { cust: 4, daysAgo: 10, status: "draft", lines: [["BRS-WGT-12", 15], ["BRS-TUB-03", 25]] },
    { cust: 5, daysAgo: 6, status: "sent", lines: [["BRS-VLV-14", 30], ["BRS-NOZ-10", 50]] },
  ];
  let qtSeq = 0;
  for (const def of quoteDefs) {
    const customer = customers[def.cust];
    const date = daysAgo(def.daysAgo);
    const inter = customer.stateCode !== SHOP_STATE;
    const items = def.lines.map(([sku, qty]) => {
      const p = bySku[sku];
      const tax = calcLineTax({ quantity: qty, rate: p.salePrice, gstRate: p.gstRate }, inter);
      return { productId: p.id, description: p.name, hsnCode: p.hsnCode, quantity: qty, rate: p.salePrice, discount: 0, gstRate: p.gstRate, deliveryDays: 15, ...tax };
    });
    const t = sumTotals(items);
    const validUntil = new Date(date);
    validUntil.setDate(validUntil.getDate() + 30);
    qtSeq += 1;
    await prisma.quotation.create({
      data: {
        quotationNo: `QT/${FY}/${String(qtSeq).padStart(4, "0")}`,
        quotationDate: date,
        validUntil,
        customerId: customer.id,
        status: def.status,
        isInterState: inter,
        ...t,
        paymentTerms: "50% advance, balance before dispatch",
        deliveryTerms: "Ex-works Ambala, 15 days from PO",
        items: { create: items },
      },
    });
  }

  // ---- Sales orders + job cards --------------------------------------
  const soDefs = [
    { cust: 0, daysAgo: 22, po: "ASW/PO/4412", status: "open", lines: [["BRS-HNG-01", 60], ["BRS-KNB-02", 100]] },
    { cust: 3, daysAgo: 13, po: "DST-PO-889", status: "open", lines: [["BRS-STP-04", 120], ["BRS-FER-09", 300]] },
    { cust: 1, daysAgo: 4, po: "HLE/2026/231", status: "open", lines: [["BRS-BSE-07", 25]] },
  ];
  let soSeq = 0;
  const createdSOs = [];
  for (const def of soDefs) {
    const customer = customers[def.cust];
    const date = daysAgo(def.daysAgo);
    const inter = customer.stateCode !== SHOP_STATE;
    const items = def.lines.map(([sku, qty]) => {
      const p = bySku[sku];
      const tax = calcLineTax({ quantity: qty, rate: p.salePrice, gstRate: p.gstRate }, inter);
      return { productId: p.id, description: p.name, hsnCode: p.hsnCode, orderedQty: qty, rate: p.salePrice, discount: 0, gstRate: p.gstRate, ...tax };
    });
    const t = sumTotals(items);
    const expected = new Date(date);
    expected.setDate(expected.getDate() + 21);
    soSeq += 1;
    const so = await prisma.salesOrder.create({
      data: {
        soNo: `SO/${FY}/${String(soSeq).padStart(4, "0")}`,
        soDate: date,
        customerId: customer.id,
        customerPoNo: def.po,
        customerPoDate: date,
        status: def.status,
        isInterState: inter,
        subTotal: t.subTotal,
        cgstTotal: t.cgstTotal,
        sgstTotal: t.sgstTotal,
        igstTotal: t.igstTotal,
        grandTotal: t.grandTotal,
        expectedDelivery: expected,
        paymentTerms: "30 days from invoice",
        deliveryTerms: "Ex-works Ambala",
        items: { create: items },
      },
    });
    createdSOs.push({ so, date });
  }

  const STAGES = ["received", "material_ready", "in_production", "qc", "packing", "ready_to_dispatch", "dispatched"];
  const jobDefs = [
    { sku: "BRS-HNG-01", so: 0, qty: 60, stage: "in_production", operator: "Sunil Sharma", machine: "Lathe-2", daysAgo: 20 },
    { sku: "BRS-KNB-02", so: 0, qty: 100, stage: "qc", operator: "Rakesh Kumar", machine: "CNC-1", daysAgo: 18 },
    { sku: "BRS-STP-04", so: 1, qty: 120, stage: "material_ready", operator: "Sunil Sharma", machine: "Lathe-1", daysAgo: 11 },
    { sku: "BRS-BSE-07", so: 2, qty: 25, stage: "received", operator: "", machine: "", daysAgo: 3 },
    { sku: "BRS-FER-09", so: 1, qty: 300, stage: "ready_to_dispatch", operator: "Sunil Sharma", machine: "CNC-2", daysAgo: 10 },
  ];
  let jcSeq = 0;
  for (const def of jobDefs) {
    const start = daysAgo(def.daysAgo);
    const target = new Date(start);
    target.setDate(target.getDate() + 18);
    jcSeq += 1;
    const card = await prisma.jobCard.create({
      data: {
        cardNo: `JC/${FY}/${String(jcSeq).padStart(4, "0")}`,
        productId: bySku[def.sku].id,
        salesOrderId: createdSOs[def.so].so.id,
        quantity: def.qty,
        currentStage: def.stage,
        operator: def.operator,
        machine: def.machine,
        startedAt: start,
        targetDate: target,
        notes: "",
      },
    });
    // walk the stage history up to the current stage
    const upto = STAGES.indexOf(def.stage);
    for (let i = 0; i <= upto; i++) {
      const at = new Date(start);
      at.setDate(at.getDate() + i * 2);
      await prisma.jobCardStage.create({
        data: { jobCardId: card.id, stage: STAGES[i], enteredAt: at, enteredBy: def.operator || "Prince Vasoya", note: i === 0 ? "Job card opened" : "" },
      });
    }
  }

  // ---- Delivery challans ---------------------------------------------
  const challanDefs = [
    { cust: 0, daysAgo: 15, purpose: "Job Work", lines: [["BRS-HNG-01", 20], ["BRS-PLT-13", 30]] },
    { cust: 1, daysAgo: 7, purpose: "For Approval", lines: [["BRS-BSE-07", 3]] },
  ];
  let dcSeq = 0;
  for (const def of challanDefs) {
    dcSeq += 1;
    await prisma.challan.create({
      data: {
        challanNo: `DC/${FY}/${String(dcSeq).padStart(4, "0")}`,
        challanDate: daysAgo(def.daysAgo),
        customerId: customers[def.cust].id,
        purpose: def.purpose,
        vehicleNo: "HR01CD" + (2000 + dcSeq),
        transporter: "Local Tempo",
        items: { create: def.lines.map(([sku, qty]) => ({ productId: bySku[sku].id, quantity: qty, remarks: "" })) },
      },
    });
  }

  const counts = {
    products: await prisma.product.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    purchases: await prisma.purchase.count(),
    sales: await prisma.sale.count(),
    quotations: await prisma.quotation.count(),
    salesOrders: await prisma.salesOrder.count(),
    jobCards: await prisma.jobCard.count(),
    challans: await prisma.challan.count(),
    payments: await prisma.payment.count(),
  };
  console.log("Demo seed complete:", counts);
  console.log("Logins — admin/admin123 (owner), manager/manager123, staff/staff123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
