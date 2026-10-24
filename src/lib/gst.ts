export type LineInput = {
  quantity: number;
  rate: number;
  discount?: number;
  gstRate: number;
};

export type LineTax = {
  taxable: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  total: number;
};

export function calcLineTax(line: LineInput, isInterState: boolean): LineTax {
  const gross = line.quantity * line.rate;
  const disc = line.discount ?? 0;
  const taxable = Math.max(0, gross - disc);
  const gstAmt = (taxable * line.gstRate) / 100;
  if (isInterState) {
    return {
      taxable: round2(taxable),
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt: round2(gstAmt),
      total: round2(taxable + gstAmt),
    };
  }
  const half = gstAmt / 2;
  return {
    taxable: round2(taxable),
    cgstAmt: round2(half),
    sgstAmt: round2(half),
    igstAmt: 0,
    total: round2(taxable + gstAmt),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumTotals(lines: LineTax[]) {
  const t = lines.reduce(
    (acc, l) => {
      acc.subTotal += l.taxable;
      acc.cgstTotal += l.cgstAmt;
      acc.sgstTotal += l.sgstAmt;
      acc.igstTotal += l.igstAmt;
      acc.grandTotal += l.total;
      return acc;
    },
    { subTotal: 0, cgstTotal: 0, sgstTotal: 0, igstTotal: 0, grandTotal: 0 }
  );
  const rounded = Math.round(t.grandTotal);
  const roundOff = round2(rounded - t.grandTotal);
  return {
    subTotal: round2(t.subTotal),
    cgstTotal: round2(t.cgstTotal),
    sgstTotal: round2(t.sgstTotal),
    igstTotal: round2(t.igstTotal),
    grandTotal: rounded,
    roundOff,
  };
}
