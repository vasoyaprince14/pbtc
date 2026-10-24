"use client";

import { useEffect } from "react";

export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print max-w-4xl mx-auto mb-4 flex flex-wrap justify-between items-center gap-2 p-3 bg-brand-50 border border-brand-200 rounded">
      <div className="text-xs text-brand-900">
        💡 <strong>Save as PDF:</strong> In the print dialog, change <em>Destination</em> to <strong>"Save as PDF"</strong> and click Save.
      </div>
      <button className="btn-primary" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
    </div>
  );
}
