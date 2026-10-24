import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireOwner();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <Link href="/users/new" className="btn-primary">+ Add User</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Username</th>
              <th className="th">Name</th>
              <th className="th">Role</th>
              <th className="th">Created</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-mono text-xs">@{u.username}</td>
                <td className="td font-medium">{u.name}</td>
                <td className="td">
                  <span className={`badge ${u.role === "owner" ? "bg-brand-100 text-brand-800" : u.role === "manager" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="td text-xs">{fmtDate(u.createdAt)}</td>
                <td className="td text-right">
                  <Link href={`/users/${u.id}`} className="text-brand-600 hover:underline text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-3">
        <strong>Roles:</strong> owner (full access), manager (all except user mgmt + settings), staff (read + create sales/challans only)
      </div>
    </div>
  );
}
