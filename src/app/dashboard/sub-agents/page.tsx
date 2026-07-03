import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { resolveActiveStore } from "@/lib/resolve-store";
import { formatPesewas } from "@/lib/site-config";
import { Users, TrendingUp, ShoppingBag, Landmark } from "lucide-react";

export const revalidate = 0;

export default async function SubAgentsTreePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  const currentStore = await resolveActiveStore(userId);

  if (!currentStore) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        You do not currently own a storefront. Please apply to become an agent to view sub-agents!
      </div>
    );
  }

  // Fetch all descendants in the tree path starting with parent path prefix
  const descendants = await db.store.findMany({
    where: {
      ancestorPath: {
        startsWith: `${currentStore.ancestorPath}/`,
      },
    },
    include: {
      orders: {
        where: { status: "DELIVERED" },
      },
      ledgers: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate segment segments for relative depth calculations
  const viewerSegmentsCount = currentStore.ancestorPath.split("/").length;

  // Process rows and map values
  const rows = descendants.map((d) => {
    const descendantSegmentsCount = d.ancestorPath.split("/").length;
    const depthLevel = descendantSegmentsCount - viewerSegmentsCount;
    
    const ordersCount = d.orders.length;
    const totalProfitPesewas = d.ledgers.reduce((sum, l) => sum + l.amountPesewas, 0);

    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      depthLevel,
      ordersCount,
      totalProfitPesewas,
      status: d.status,
      createdAt: d.createdAt,
    };
  });

  // Calculate aggregate metrics across all depths combined
  const aggregateOrders = rows.reduce((sum, r) => sum + r.ordersCount, 0);
  const aggregateProfitPesewas = rows.reduce((sum, r) => sum + r.totalProfitPesewas, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Sub-Agents Tree
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete read-only visibility into your entire downline tree at all depths.
        </p>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Total Downline Stores</span>
          <span className="text-2xl font-bold text-white">{rows.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Total Downline Orders</span>
          <span className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-450" />
            {aggregateOrders}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Total Downline Volume</span>
          <span className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {formatPesewas(aggregateProfitPesewas)}
          </span>
        </div>
      </div>

      {/* Descendants List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-white mb-4">Downline Index</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase">
                <th className="pb-3">Storefront Name</th>
                <th className="pb-3">Slug Path</th>
                <th className="pb-3">Downline Tier</th>
                <th className="pb-3">Delivered Orders</th>
                <th className="pb-3 text-right">Earning Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {rows.map((r) => (
                <tr key={r.id} className="text-slate-350 hover:text-white transition">
                  <td className="py-4 text-xs font-bold text-white">{r.name}</td>
                  <td className="py-4 text-xs font-mono">/shop/{r.slug}</td>
                  <td className="py-4 text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.depthLevel === 1 
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                        : "bg-slate-950 text-slate-400 border-slate-850"
                    }`}>
                      {r.depthLevel} level{r.depthLevel > 1 ? "s" : ""} down
                    </span>
                  </td>
                  <td className="py-4 text-xs font-mono">{r.ordersCount} orders</td>
                  <td className="py-4 text-xs text-right font-mono text-emerald-405">
                    {formatPesewas(r.totalProfitPesewas)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-550 text-xs">
                    No downline sub-agents registered under your store yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
