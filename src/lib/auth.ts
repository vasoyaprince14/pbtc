import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "./session";

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  return session;
}

export type Role = "owner" | "manager" | "staff";

const ROLE_RANK: Record<Role, number> = { owner: 3, manager: 2, staff: 1 };

export function hasRole(userRole: string | undefined, min: Role): boolean {
  const r = (userRole ?? "staff") as Role;
  return (ROLE_RANK[r] ?? 0) >= ROLE_RANK[min];
}

export async function requireApiUser(minRole: Role = "staff") {
  const session = await getSession();
  if (!session.userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasRole(session.role, minRole)) return { error: NextResponse.json({ error: "Forbidden — insufficient role" }, { status: 403 }) };
  return { session };
}

export async function requireOwner() {
  const session = await requireUser();
  if (!hasRole(session.role, "owner")) redirect("/dashboard?err=forbidden");
  return session;
}
