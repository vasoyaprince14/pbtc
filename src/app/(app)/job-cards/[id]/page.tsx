import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate, num } from "@/lib/format";
import { STAGE_LABEL, STAGE_COLOR, JOB_STAGES, JobStage } from "@/lib/jobcard";
import StageActions from "./StageActions";

export const dynamic = "force-dynamic";

export default async function JobCardDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const jc = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      product: { include: { documents: true } },
      salesOrder: { include: { customer: true } },
      stages: { orderBy: { enteredAt: "asc" } },
    },
  });
  if (!jc) notFound();

  const currentIdx = JOB_STAGES.indexOf(jc.currentStage as JobStage);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Job Card {jc.cardNo}
          <span className={`ml-3 badge ${STAGE_COLOR[jc.currentStage as JobStage] ?? "bg-gray-100"}`}>
            {STAGE_LABEL[jc.currentStage as JobStage] ?? jc.currentStage}
          </span>
        </h1>
        <Link href="/job-cards" className="btn-secondary">Back</Link>
      </div>

      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Product</div>
          <div className="font-semibold">{jc.product.name}</div>
          <div className="text-xs font-mono text-gray-600">{jc.product.sku}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Quantity</div>
          <div className="text-lg font-bold">{num(jc.quantity, 0)} {jc.product.unit}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Machine / Operator</div>
          <div>{jc.machine || "—"}</div>
          <div className="text-xs">{jc.operator || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Dates</div>
          <div className="text-xs">Started: {jc.startedAt ? fmtDate(jc.startedAt) : "—"}</div>
          <div className="text-xs">Target: {jc.targetDate ? fmtDate(jc.targetDate) : "—"}</div>
          {jc.completedAt && <div className="text-xs text-green-700">Completed: {fmtDate(jc.completedAt)}</div>}
        </div>
      </div>

      {jc.salesOrder && (
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200 border text-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-blue-800 font-semibold">Sales Order</div>
            <div className="font-mono">{jc.salesOrder.soNo}</div>
            <div className="text-xs">{jc.salesOrder.customer.name}</div>
          </div>
          <Link href={`/sales-orders/${jc.salesOrder.id}`} className="btn-secondary text-sm">View SO →</Link>
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">Production Progress</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {JOB_STAGES.map((s, i) => {
            const done = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  current ? "bg-brand-600 text-white ring-4 ring-brand-200" :
                  done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>{i + 1}</div>
                <div className={`text-xs ${current ? "font-bold text-brand-700" : done ? "text-green-700" : "text-gray-500"}`}>
                  {STAGE_LABEL[s]}
                </div>
                {i < JOB_STAGES.length - 1 && <div className={`w-6 h-0.5 ${done ? "bg-green-500" : "bg-gray-300"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <StageActions jobCardId={jc.id} currentStage={jc.currentStage} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="card overflow-hidden">
          <div className="p-3 border-b bg-gray-50 font-semibold text-sm">Stage History</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Stage</th>
                <th className="th">When</th>
                <th className="th">By</th>
                <th className="th">Note</th>
              </tr>
            </thead>
            <tbody>
              {jc.stages.map((s) => (
                <tr key={s.id}>
                  <td className="td">
                    <span className={`badge ${STAGE_COLOR[s.stage as JobStage] ?? "bg-gray-100"}`}>
                      {STAGE_LABEL[s.stage as JobStage] ?? s.stage}
                    </span>
                  </td>
                  <td className="td text-xs">{fmtDate(s.enteredAt)} {new Date(s.enteredAt).toLocaleTimeString().slice(0, 5)}</td>
                  <td className="td text-xs">{s.enteredBy || "—"}</td>
                  <td className="td text-xs">{s.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="p-3 border-b bg-gray-50 font-semibold text-sm">Drawings &amp; Documents</div>
          {jc.product.documents.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No drawings uploaded for this product. <Link href={`/products/${jc.product.id}`} className="text-brand-600 hover:underline">Add now →</Link></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">File</th>
                  <th className="th">Category</th>
                </tr>
              </thead>
              <tbody>
                {jc.product.documents.map((d) => (
                  <tr key={d.id}>
                    <td className="td">
                      <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                        {d.originalName}
                      </a>
                    </td>
                    <td className="td text-xs"><span className="badge bg-gray-100">{d.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {jc.notes && (
        <div className="card p-4 mt-4 text-sm">
          <div className="font-semibold mb-1">Notes:</div>
          <div className="whitespace-pre-line">{jc.notes}</div>
        </div>
      )}
    </div>
  );
}
