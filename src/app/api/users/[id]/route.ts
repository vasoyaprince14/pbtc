import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  role: z.enum(["owner", "manager", "staff"]),
  password: z.string().min(6).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, role, password } = parsed.data;

  const data: any = { name, role };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: user.id });
}
