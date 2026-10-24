import { prisma } from "@/lib/db";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.shopSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Shop Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
