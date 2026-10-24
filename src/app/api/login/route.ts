import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.name = user.name;
  session.role = user.role;
  await session.save();
  return NextResponse.json({ ok: true });
}
