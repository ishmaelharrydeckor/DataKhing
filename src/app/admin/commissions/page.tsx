import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas } from "@/lib/site-config";
import { redirect } from "next/navigation";
import { Coins, PiggyBank, ArrowDownRight, TrendingUp } from "lucide-react";
import { CommissionsClient } from "./commissions-client";

export const revalidate = 0;

export default async function AdminCommissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/");
  }

  // Fetch pending withdrawals
  const pendingWithdrawals = await db.withdrawal.findMany({
    where: { status: "PENDING" },
    include: { store: true },
    orderBy: { requestedAt: "desc" },
  });

  // Fetch delivered orders
  const deliveredOrders = await db.order.findMany({
    where: { status: "DELIVERED" },
    include: { bundle: true },
  });

  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.amountPaid, 0);
  const totalSupplierCost = deliveredOrders.reduce((sum, o) => sum + o.bundle.supplierCostPesewas, 0);

  // Fetch completed withdrawals
  const completedWithdrawals = await db.withdrawal.findMany({
    where: { status: "COMPLETED" },
  });
  const totalCommissionsPaid = completedWithdrawals.reduce((sum, w) => sum + w.amountPesewas, 0);

  const netMargin = totalRevenue - totalSupplierCost - totalCommissionsPaid;

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider mb-2">
              Financial Administration
            </span>
            <h1 className="text-2xl font-bold text-white">Commissions & Payouts</h1>
            <p className="text-xs text-slate-400 mt-1">Approve pending agent withdrawals, record payout settlements, and review business profits.</p>
          </div>
        </div>

        {/* Profit Reconciliation View */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-400" />
            Financial Reconciliation (All-Time)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Gross Revenue</span>
              </div>
              <span className="text-lg font-black text-white">{formatPesewas(totalRevenue)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Total revenue collected from successful orders</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Supplier Cost</span>
              </div>
              <span className="text-lg font-black text-rose-400/90">-{formatPesewas(totalSupplierCost)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Cost of bundles paid to upstream supplier</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Coins className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Commissions Settled</span>
              </div>
              <span className="text-lg font-black text-amber-400">-{formatPesewas(totalCommissionsPaid)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Paid out agent referral/sales commissions</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 bg-gradient-to-br from-indigo-950/30 to-slate-950">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <PiggyBank className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Net Profit Margin</span>
              </div>
              <span className={`text-xl font-black ${netMargin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPesewas(netMargin)}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Net profit after supplier costs and commissions</p>
            </div>
          </div>
        </div>

        {/* Client Interactive Area */}
        <CommissionsClient pendingWithdrawals={pendingWithdrawals} />

      </div>
    </div>
  );
}
