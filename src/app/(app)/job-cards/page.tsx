import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate, num } from "@/lib/format";
import { STAGE_COLOR, STAGE_LABEL, JobStage } from "@/lib/jobcard";

export const dynamic = "force-dynamic";

export default async function JobCardsPage({
  searchParams,
}: {
  searchParams?: { stage?: string };
}) {
  const stage = searchParams?.stage;
  const jobCards = await prisma.jobCard.findMany({
    where: stage ? { currentStage: stage } : {},
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      salesOrder: { include: { customer: true } },
    },
    take: 200,
  });

  const counts = await prisma.jobCard.groupBy({
    by: ["currentStage"],
    _count: { _all: true },
  });
  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.currentStage] = c._count._all;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Job Cards / Production</h1>
        <Link href="/job-cards/new" className="btn-primary">+ New Job Card</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <Link href="/job-cards" className={`btn ${!stage ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
          All ({jobCards.length})
        </Link>
        {(Object.keys(STAGE_LABEL) as JobStage[]).map((s) => (
          <Link key={s} href={`/job-cards?stage=${s}`} className={`btn ${stage === s ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
            {STAGE_LABEL[s]} ({countMap[s] ?? 0})
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Card No</th>
              <th className="th">Product</th>
              <th className="th text-right">Qty</th>
              <th className="th">SO / Customer</th>
              <th className="th">Machine</th>
              <th className="th">Operator</th>
              <th className="th">Started</th>
              <th className="th">Target</th>
              <th className="th">Stage</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {jobCards.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={10}>No job cards</td></tr>
            )}
            {jobCards.map((jc) => (
              <tr key={jc.id} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{jc.cardNo}</td>
                <td className="td font-medium">{jc.product.name}</td>
                <td className="td text-right">{num(jc.quantity, 0)}</td>
                <td className="td text-xs">
                  {jc.salesOrder ? (
                    <>
                      <div className="font-mono">{jc.salesOrder.soNo}</div>
                      <div className="text-gray-600">{jc.salesOrder.customer.name}</div>
                    </>
                  ) : "—"}
                </td>
                <td className="td text-xs">{jc.machine || "—"}</td>
                <td className="td text-xs">{jc.operator || "—"}</td>
                <td className="td text-xs">{jc.startedAt ? fmtDate(jc.startedAt) : "—"}</td>
                <td className="td text-xs">{jc.targetDate ? fmtDate(jc.targetDate) : "—"}</td>
                <td className="td">
                  <span className={`badge ${STAGE_COLOR[jc.currentStage as JobStage] ?? "bg-gray-100"}`}>
                    {STAGE_LABEL[jc.currentStage as JobStage] ?? jc.currentStage}
                  </span>
                </td>
                <td className="td text-right">
                  <Link href={`/job-cards/${jc.id}`} className="text-brand-600 hover:underline text-xs">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
