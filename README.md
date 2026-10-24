# PBTC — Prince Brass Trading Co.

Web-based shop management platform for a scientific instrument parts shop in Ambala, Haryana.

## Features

- **Products** — SKU, HSN code, unit, rack/location, GST rate, purchase & sale price, opening stock, min-stock alerts
- **Customers & Suppliers** — with GSTIN (auto-detects state code from GSTIN), address, opening balance
- **Sales Invoice (GST)** — automatic CGST+SGST for intra-state sales, IGST for inter-state, print-ready A4 layout with HSN-wise tax summary and amount in words
- **Purchase Entry** — supplier bill with same tax logic, auto-increments stock
- **Delivery Challan** — with vehicle no, transporter, purpose (job work / for approval / sample etc.), print view
- **Payments** — record money received from customers / paid to suppliers
- **Reports** — Daily P&L (with COGS-based profit), Stock Report (with valuation), GST Summary (output vs input tax, ITC), Customer & Supplier Outstanding, Item-wise Sales Report
- **CSV Import** — bulk upload for products, customers and suppliers with template downloads and per-row error reporting
- **Barcode Print** — print A4 sheets of Code128 barcode labels (SKU + name + price)
- **WhatsApp Share** — one-click share of invoice summary to customer's WhatsApp
- **Multi-user with Roles** — owner (full access), manager (no user mgmt / settings), staff (sales only)
- **Backup** — one-click DB download + daily auto-backup script (macOS launchd) + last-30 rotation
- **Shop Settings** — GSTIN, address, bank details, invoice/challan numbering

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Prisma ORM + SQLite (single file DB — easy backup)
- Tailwind CSS
- iron-session for login
- Zod for input validation

## First-Time Setup

```bash
npm install
npx prisma db push
node prisma/seed.mjs
```

That creates the database, sets up shop defaults, and creates admin user.

## Run the App

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

**Default login:** `admin` / `admin123`  → **change your password / seed a new user after first login**.

## Production Build

```bash
npm run build
npm start
```

## Backup

The whole database is a single file: `prisma/dev.db`. Copy it anywhere to back up.

## Recommended First Steps

1. **Settings** → fill in your shop's GSTIN, full address, bank details, invoice prefix
2. **Products** → add all your SKUs with correct HSN codes, GST rates, opening stock, min-stock alerts, rack location
3. **Customers** → add your regulars with their GSTIN (state code auto-detects from GSTIN)
4. **Suppliers** → same for your vendors
5. **Sales / Purchase / Challan** → start entering daily transactions
6. **Reports** → check P&L, GST summary, and outstanding periodically

## GST Logic

The app automatically decides between CGST+SGST (intra-state) and IGST (inter-state) by comparing the customer's/supplier's `stateCode` against your shop's `stateCode` from Settings. Make sure your Shop Settings state code is correct (Haryana = 06 by default).
