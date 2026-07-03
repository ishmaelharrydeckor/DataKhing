import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AgentsList from "./AgentsList";
import { resolveActiveStore } from "@/lib/resolve-store";

export const revalidate = 0;

export default async function AgentsDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  const currentStore = await resolveActiveStore(userId);

  if (!currentStore) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        You do not currently own a storefront. Please apply to become an agent to configure settings!
      </div>
    );
  }

  // Fetch DIRECT child stores
  const childStores = await db.store.findMany({
    where: { parentStoreId: currentStore.id },
    include: {
      orders: {
        where: { status: "DELIVERED" },
      },
      ledgers: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">My Reseller Agents</h2>
        <p className="text-xs text-slate-400 mt-1">
          Monitor your direct sub-agent storefront metrics, total volumes, and toggle store suspension active status.
        </p>
      </div>

      <AgentsList stores={childStores} />
    </div>
  );
}
