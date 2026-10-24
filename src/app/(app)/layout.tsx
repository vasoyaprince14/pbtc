import Link from "next/link";
import { requireUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LogoutButton from "./_components/LogoutButton";

type NavItem = { href: string; label: string; icon: string; minRole?: "owner" | "manager" | "staff" };

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/products", label: "Products", icon: "📦" },
  { href: "/customers", label: "Customers", icon: "🧾" },
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/quotations", label: "Quotations", icon: "📝" },
  { href: "/sales-orders", label: "Sales Orders", icon: "📋" },
  { href: "/job-cards", label: "Job Cards", icon: "🔧" },
  { href: "/purchases", label: "Purchases", icon: "📥" },
  { href: "/sales", label: "Sales / Invoice", icon: "💰" },
  { href: "/challans", label: "Delivery Challan", icon: "🚚" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/reports", label: "Reports", icon: "📊", minRole: "manager" },
  { href: "/import", label: "CSV Import", icon: "📤", minRole: "manager" },
  { href: "/admin/backup", label: "Backup", icon: "💾", minRole: "owner" },
  { href: "/users", label: "Users", icon: "👥", minRole: "owner" },
  { href: "/settings", label: "Shop Settings", icon: "⚙️", minRole: "owner" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 flex flex-col no-print">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="text-brand-400 font-bold text-lg leading-tight">
            {settings?.shopName ?? "PBTC"}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {settings?.city ? `${settings.city}, ${settings.stateName}` : "Ambala, Haryana"}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {nav
            .filter((item) => !item.minRole || hasRole(session.role, item.minRole))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
        <div className="border-t border-gray-800 p-3 text-xs">
          <div className="text-gray-300">{session.name}</div>
          <div className="text-gray-500 mb-1">@{session.username}</div>
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase bg-gray-800 text-brand-300 font-semibold">
              {session.role}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
