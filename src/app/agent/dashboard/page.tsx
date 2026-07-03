import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { redirect } from "next/navigation";
import { ShieldCheck, DollarSign, ListOrdered, ArrowLeft, Clock, CheckCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { resolveActiveStore } from "@/lib/resolve-store";

export const revalidate = 0;

interface MappedLedger {
  id: string;
  orderId: string | null;
  amountPesewas: number;
  status: string;
  createdAt: Date;
  bundleLabel: string;
  buyPricePesewas: number;
  sellPricePesewas: number;
}

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user ? (session.user as any).role : null;
  if (!session?.user || (role !== "AGENT" && role !== "ADMIN")) {
    redirect("/agent/apply");
  }

  const userId = (session.user as any).id;

  // Self-healing: if admin logged in does not own the ROOT store, fix ownership
  if (role === "ADMIN") {
    const rootStore = await db.store.findFirst({
      where: { storeType: "ROOT" },
    });
    if (rootStore && rootStore.ownerUserId !== userId) {
      await db.store.update({
        where: { id: rootStore.id },
        data: { ownerUserId: userId },
      });
    }
  }

  // Find store owned by this agent
  const store = await resolveActiveStore(userId);

  if (!store) {
    redirect("/agent/apply");
  }

  // Fetch all orders made by this agent
  const orders = await db.order.findMany({
    where: { userId },
    include: { bundle: true },
    orderBy: { createdAt: "desc" },
  });

  // Calculate standard stats
  const totalSalesCount = orders.filter((o) => o.status === "DELIVERED").length;
  const totalVolumePesewas = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amountPaid, 0);

  // Fetch store ledger items
  const ledgerItems = await db.ledger.findMany({
    where: { storeId: store.id },
    include: {
      order: {
        include: { bundle: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const availableBalance = ledgerItems
    .filter((l) => l.status === "AVAILABLE")
    .reduce((sum, l) => sum + l.amountPesewas, 0);

  const withdrawnBalance = ledgerItems
    .filter((l) => l.status === "WITHDRAWN")
    .reduce((sum, l) => sum + l.amountPesewas, 0);

  // Map to historical view format
  const mappedHistory: MappedLedger[] = ledgerItems.map((l) => ({
    id: l.id,
    orderId: l.orderId,
    amountPesewas: l.amountPesewas,
    status: l.status,
    createdAt: l.createdAt,
    bundleLabel: l.order?.bundle?.label || "Become Reseller Fee",
    buyPricePesewas: l.buyPricePesewas,
    sellPricePesewas: l.sellPricePesewas,
  }));

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
              <ShieldCheck className="w-6 h-6" />
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
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Available Ledger Profit</span>
              <span className="text-2xl font-bold text-white">{formatPesewas(availableBalance)}</span>
            </div>
          </div>
        </div>

        {/* Commission Bookings Board */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Referral & Sales Commissions</h2>
              <p className="text-xs text-slate-400 mt-1">Bookkeeping summaries of earnings collected via your agent account or custom referrals.</p>
            </div>
            <Link
              href="/dashboard/withdrawals"
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
            >
              Request Withdrawal
            </Link>
          </div>

          {/* Detailed Commission breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Available Profit</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">{formatPesewas(availableBalance)}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Withdrawn</span>
              </div>
              <span className="text-lg font-bold text-white">{formatPesewas(withdrawnBalance)}</span>
            </div>
          </div>

          {/* Historical Commissions Ledger */}
          <div className="overflow-x-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Earnings History Ledger</h3>
            {mappedHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No ledger records found.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                    <th className="pb-3">Transaction ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Buy Price</th>
                    <th className="pb-3">Sell Price</th>
                    <th className="pb-3">Profit</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-medium">
                  {mappedHistory.map((item) => (
                    <tr key={item.id} className="text-slate-300 hover:text-white transition">
                      <td className="py-3 font-mono">{item.id.slice(0, 8)}...</td>
                      <td className="py-3 text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">{item.bundleLabel}</td>
                      <td className="py-3 text-slate-400">{formatPesewas(item.buyPricePesewas)}</td>
                      <td className="py-3 text-slate-400">{formatPesewas(item.sellPricePesewas)}</td>
                      <td className="py-3 font-bold text-emerald-400">+{formatPesewas(item.amountPesewas)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            item.status === "AVAILABLE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pricing Catalog Sheet */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-bold text-white mb-6 font-semibold">Discount Reseller Price List</h3>

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
