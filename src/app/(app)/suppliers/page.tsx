import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";
  const suppliers = await prisma.supplier.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { gstin: { contains: q } }, { city: { contains: q } }, { phone: { contains: q } }] }
      : {},
    orderBy: { name: "asc" },
    take: 500,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
        <Link href="/suppliers/new" className="btn-primary">+ Add Supplier</Link>
      </div>
      <form className="mb-4">
        <input type="text" name="q" defaultValue={q} placeholder="Search name, GSTIN, phone…" className="input max-w-md" />
      </form>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">GSTIN</th>
              <th className="th">State</th>
              <th className="th">City</th>
              <th className="th">Phone</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={6}>No suppliers yet</td></tr>
            )}
            {suppliers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="td font-medium">{c.name}</td>
                <td className="td font-mono text-xs">{c.gstin || "—"}</td>
                <td className="td text-xs">{c.stateName || "—"} {c.stateCode && `(${c.stateCode})`}</td>
                <td className="td text-xs">{c.city || "—"}</td>
                <td className="td text-xs">{c.phone || "—"}</td>
                <td className="td text-right">
                  <Link href={`/suppliers/${c.id}`} className="text-brand-600 hover:underline text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">Showing {suppliers.length} supplier(s)</div>
    </div>
  );
}
