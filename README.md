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

## Public Demo

`render.yaml` deploys a **demo-only** instance to Render's free plan.

**Demo logins:** `admin` / `admin123` (owner) · `manager` / `manager123` · `staff` / `staff123`

The build seeds realistic sample data (`npm run db:seed:demo`) — 14 brass SKUs,
6 customers across 4 states so both CGST+SGST and IGST invoices appear, 5
purchases, 12 invoices, quotations, sales orders, job cards mid-production, and
payments, so every report has real numbers.

> **The demo database is intentionally throwaway.** Render's free plan has no
> persistent disk, so the SQLite file lives only inside the running container
> and resets to clean sample data on every restart or redeploy. That keeps
> visitors from permanently breaking the demo — but it means this setup must
> **never** be used for the real shop. Real use needs a host with a persistent
> volume (see below).

### Deploying the demo

1. Push this repo to GitHub.
2. On Render: **New → Blueprint**, pick the repo. It reads `render.yaml` and
   generates `SESSION_SECRET` automatically.
3. After the first deploy, add a repo variable `DEMO_URL` pointing at the
   Render URL so `.github/workflows/keepalive.yml` can keep it warm — free
   services sleep after 15 idle minutes and take ~50s to wake.

### Hosting the real thing

For actual shop use the app needs a **persistent disk**, because three things
write to the filesystem: the SQLite DB (`prisma/dev.db`), product document
uploads (`uploads/`), and the backup button (`backups/`). Serverless hosts
(Vercel, Netlify, Render free) will silently lose all three. Use a VPS, or any
host with a mounted volume. Always set `TZ=Asia/Kolkata` — on a UTC server,
invoice dates and the daily P&L land on the wrong day after 05:30 IST.

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
