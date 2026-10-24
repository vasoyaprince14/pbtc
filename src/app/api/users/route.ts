import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3).max(32),
  name: z.string().min(1),
  role: z.enum(["owner", "manager", "staff"]),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { username, name, role, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username: username.toLowerCase(), name, role, passwordHash },
    });
    return NextResponse.json({ id: user.id, username: user.username });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
