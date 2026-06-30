import { db } from "@/lib/db";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { DollarSign, ShieldAlert, ShoppingBag, Users, HelpCircle, AlertCircle, Info, Zap } from "lucide-react";

export const revalidate = 0;

export default async function AdminOverviewPage() {
  const totalUsers = await db.user.count();
  const totalOrders = await db.order.count();
  
  const successOrders = await db.order.findMany({
    where: { status: "DELIVERED" },
    include: { bundle: true },
  });

  const failedOrdersCount = await db.order.count({
    where: { status: "FAILED" },
  });

  // Calculate financials
  const grossSalesPesewas = successOrders.reduce((sum, o) => sum + o.amountPaid, 0);
  const costVolumePesewas = successOrders.reduce((sum, o) => sum + o.bundle.supplierCostPesewas, 0);
  const netProfitPesewas = grossSalesPesewas - costVolumePesewas;

  const failureRatePercent = totalOrders > 0 
    ? ((failedOrdersCount / totalOrders) * 100).toFixed(1) 
    : "0.0";

  // Fetch recent audit logs
  const auditLogs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: true },
  });

  return (
    <div className="space-y-8">
      {/* Configuration Status Widget */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-xs sm:text-sm text-indigo-300 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            System is running in <span className="font-bold text-white uppercase">{SITE_CONFIG.MOCK_MODE ? "MOCK_MODE" : "LIVE_PRODUCTION"}</span>. No real supplier charges or Paystack debits will occur.
          </span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      </div>

      {/* Financials Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Gross Sales</span>
            <span className="text-xl font-bold text-white">{formatPesewas(grossSalesPesewas)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Total Orders</span>
            <span className="text-xl font-bold text-white">{totalOrders} Orders</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Failure Rate</span>
            <span className="text-xl font-bold text-rose-400">{failureRatePercent}%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">System Profit</span>
            <span className="text-xl font-bold text-amber-400">{formatPesewas(netProfitPesewas)}</span>
          </div>
        </div>
      </div>

      {/* Audit Log and System Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-bold text-white mb-6">Recent System Audit Trails</h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-xs flex justify-between items-start gap-4"
              >
                <div>
                  <span className="font-bold text-indigo-400 uppercase block mb-1">
                    {log.action}
                  </span>
                  <p className="text-slate-400 font-mono text-[10px] leading-relaxed max-w-md truncate">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-slate-600 block mt-2">
                    Performed by {log.user?.email || "System"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No system audits recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white mb-4">Total Platform Users</h3>
            <span className="text-4xl font-extrabold text-white">{totalUsers}</span>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Including retail customer signups, approved reseller agents, and administrative control users.
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-850">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Quick Reference</h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Admin Login:</span>
                <span className="text-white font-semibold">admin@datahub.com</span>
              </div>
              <div className="flex justify-between">
                <span>Agent Login:</span>
                <span className="text-white font-semibold">agent@datahub.com</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Login:</span>
                <span className="text-white font-semibold">customer@datahub.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
