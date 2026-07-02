import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import WithdrawalsForm from "./WithdrawalsForm";
import { formatPesewas } from "@/lib/site-config";
import { ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";

export const revalidate = 0;

export default async function WithdrawalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  const currentStore = await db.store.findFirst({
    where: { ownerUserId: userId },
  });

  if (!currentStore) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        You do not currently own a storefront. Please apply to become an agent to view ledger stats!
      </div>
    );
  }

  // Fetch available ledger balance
  const availableLedgers = await db.ledger.findMany({
    where: {
      storeId: currentStore.id,
      status: "AVAILABLE",
    },
  });

  const availableBalancePesewas = availableLedgers.reduce((sum, l) => sum + l.amountPesewas, 0);

  // Fetch past withdrawals
  const withdrawals = await db.withdrawal.findMany({
    where: { storeId: currentStore.id },
    orderBy: { requestedAt: "desc" },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Withdraw Ledger Profits</h2>
        <p className="text-xs text-slate-400 mt-1">
          Withdraw accumulated margins from your available storefront sales. Manual or Paystack automated transfers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm min-h-[160px]">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Available Ledger Profit</span>
            <span className="text-2xl font-bold text-emerald-400">{formatPesewas(availableBalancePesewas)}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed mt-4">
            Marginal earnings from child sales and storefront conversions lock into available status once order is delivered.
          </p>
        </div>

        <div className="md:col-span-2">
          <WithdrawalsForm storeId={currentStore.id} availableBalancePesewas={availableBalancePesewas} />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-white mb-6">Historical Withdrawals Log</h3>
        
        <div className="overflow-x-auto">
          {withdrawals.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-4">No withdrawals recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                  <th className="pb-3">Request ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Reference</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="text-slate-300 hover:text-white transition">
                    <td className="py-3 font-mono">{w.id.slice(0, 8)}...</td>
                    <td className="py-3 text-slate-400">{new Date(w.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3 font-bold text-slate-400 text-[10px]">{w.payoutMethod}</td>
                    <td className="py-3 font-bold text-emerald-400">-{formatPesewas(w.amountPesewas)}</td>
                    <td className="py-3 font-mono text-slate-400">{w.payoutReference || "N/A"}</td>
                    <td className="py-3 text-right">{getStatusBadge(w.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
