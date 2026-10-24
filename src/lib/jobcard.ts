export const JOB_STAGES = [
  "received",
  "material_ready",
  "in_production",
  "qc",
  "packing",
  "ready_to_dispatch",
  "dispatched",
] as const;

export type JobStage = typeof JOB_STAGES[number];

export const STAGE_LABEL: Record<JobStage, string> = {
  received: "Received",
  material_ready: "Material Ready",
  in_production: "In Production",
  qc: "Quality Check",
  packing: "Packing",
  ready_to_dispatch: "Ready to Dispatch",
  dispatched: "Dispatched",
};

export const STAGE_COLOR: Record<JobStage, string> = {
  received: "bg-gray-100 text-gray-700",
  material_ready: "bg-yellow-100 text-yellow-800",
  in_production: "bg-blue-100 text-blue-800",
  qc: "bg-purple-100 text-purple-800",
  packing: "bg-indigo-100 text-indigo-800",
  ready_to_dispatch: "bg-orange-100 text-orange-800",
  dispatched: "bg-green-100 text-green-800",
};

export function nextStage(current: string): JobStage | null {
  const idx = JOB_STAGES.indexOf(current as JobStage);
  if (idx < 0 || idx >= JOB_STAGES.length - 1) return null;
  return JOB_STAGES[idx + 1];
}
