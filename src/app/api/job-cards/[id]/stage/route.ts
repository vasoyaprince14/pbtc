import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { JOB_STAGES } from "@/lib/jobcard";

const schema = z.object({
  stage: z.enum(JOB_STAGES),
  note: z.string().default(""),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const { stage, note } = parsed.data;
  const session = guard.session!;

  const updated = await prisma.$transaction(async (tx) => {
    const jc = await tx.jobCard.update({
      where: { id },
      data: {
        currentStage: stage,
        completedAt: stage === "dispatched" ? new Date() : null,
      },
    });
    await tx.jobCardStage.create({
      data: {
        jobCardId: id,
        stage,
        note,
        enteredBy: session.username ?? "",
      },
    });
    return jc;
  });
  return NextResponse.json(updated);
}
