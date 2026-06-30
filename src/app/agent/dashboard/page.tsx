import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { redirect } from "next/navigation";
import { ShieldCheck, TrendingUp, DollarSign, ListOrdered, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "AGENT") {
    redirect("/agent/apply");
  }

  const userId = (session.user as any).id;

  // Fetch all orders made by this agent
  const orders = await db.order.findMany({
    where: { userId },
    include: { bundle: true },
    orderBy: { createdAt: "desc" },
  });

  // Calculate statistics
  const totalSalesCount = orders.filter((o) => o.status === "DELIVERED").length;
  const totalVolumePesewas = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amountPaid, 0);

  // Agent pricing sheet
  const bundles = await db.bundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataAmountGB: "asc" }],
  });

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider mb-2">
              Verified Reseller Partner
            </span>
            <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">Manage bulk orders, track sales commission, and review tier markup margins.</p>
          </div>
          <Link href="/" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-semibold text-xs transition self-start sm:self-center shrink-0 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
            <ArrowLeft className="w-3.5 h-3.5" /> Place Agent Order
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400">
              <ListOrdered className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Successful Sales</span>
              <span className="text-2xl font-bold text-white">{totalSalesCount} Orders</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Sales Turn-over</span>
              <span className="text-2xl font-bold text-emerald-400">{formatPesewas(totalVolumePesewas)}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Average Margin</span>
              <span className="text-2xl font-bold text-white">~15% Profit</span>
            </div>
          </div>
        </div>

        {/* Pricing Catalog Sheet */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-bold text-white mb-6">Discount Reseller Price List</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase">
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Bundle Name</th>
                  <th className="pb-3">Standard Retail</th>
                  <th className="pb-3">Your Agent Price</th>
                  <th className="pb-3 text-right">Instant Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {bundles.map((b) => {
                  const profit = b.sellPricePesewas - b.agentPricePesewas;
                  return (
                    <tr key={b.id} className="text-slate-300 hover:text-white transition">
                      <td className="py-4 font-bold text-xs">{b.network}</td>
                      <td className="py-4 text-xs">{b.label}</td>
                      <td className="py-4 text-xs text-slate-400">{formatPesewas(b.sellPricePesewas)}</td>
                      <td className="py-4 text-xs font-bold text-indigo-400">{formatPesewas(b.agentPricePesewas)}</td>
                      <td className="py-4 text-right text-xs font-bold text-emerald-400">
                        +{formatPesewas(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
