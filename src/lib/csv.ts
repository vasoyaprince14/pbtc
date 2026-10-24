// Minimal RFC4180-ish CSV parser: handles quoted fields, commas inside quotes, escaped quotes.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
      } else {
        cur += ch;
        i++;
      }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { row.push(cur); cur = ""; i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") {
        row.push(cur); cur = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
        row = [];
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
  }
  return rows;
}

/**
 * Collapses a CSV header to its canonical key, so exports from Excel/Tally
 * import without hand-renaming columns: "HSN Code", "hsn_code" and "HSNCODE"
 * all become "hsncode".
 */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function toRecords(csv: string[][]): Record<string, string>[] {
  if (csv.length === 0) return [];
  const headers = csv[0].map((h) => normalizeHeader(h));
  return csv.slice(1).map((row) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = (row[i] ?? "").trim(); });
    return rec;
  });
}
