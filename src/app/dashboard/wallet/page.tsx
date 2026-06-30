import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas } from "@/lib/site-config";
import WalletTopupForm from "@/components/WalletTopupForm";
import { ArrowDownLeft, ArrowUpRight, Award, BadgeDollarSign, Wallet } from "lucide-react";

export const revalidate = 0;

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });

  const transactions = await db.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const getTxDetails = (type: string, amount: number) => {
    switch (type) {
      case "TOPUP":
        return {
          label: "Wallet Top-up",
          icon: <ArrowDownLeft className="w-4 h-4 text-emerald-400" />,
          bgColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          amountFormatted: `+${formatPesewas(amount)}`,
        };
      case "REFERRAL_CREDIT":
        return {
          label: "Referral Cashback",
          icon: <Award className="w-4 h-4 text-amber-400" />,
          bgColor: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          amountFormatted: `+${formatPesewas(amount)}`,
        };
      case "PURCHASE":
        return {
          label: "Bundle Purchase",
          icon: <ArrowUpRight className="w-4 h-4 text-slate-400" />,
          bgColor: "bg-slate-800/80 border-slate-700/80 text-slate-300",
          // Since purchase amount is recorded negative, parse it nicely
          amountFormatted: formatPesewas(amount), 
        };
      case "PAYOUT":
        return {
          label: "Commissions Cashout",
          icon: <BadgeDollarSign className="w-4 h-4 text-rose-400" />,
          bgColor: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          amountFormatted: formatPesewas(amount),
        };
      default:
        return {
          label: "Transaction",
          icon: <Wallet className="w-4 h-4 text-slate-400" />,
          bgColor: "bg-slate-850 text-slate-300",
          amountFormatted: formatPesewas(amount),
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Topup Form component */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-bold text-white mb-4">Top-Up Wallet</h3>
          <p className="text-slate-400 text-xs mb-6">
            Credit your wallet via Mobile Money (MTN, Telecel, AirtelTigo). Use wallet balance for instant, single-click data purchases.
          </p>

          <WalletTopupForm />
        </div>
      </div>

      {/* Transaction History log */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-white mb-6">Wallet Transactions</h3>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {transactions.map((tx) => {
            const details = getTxDetails(tx.type, tx.amountPesewas);

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-850 hover:border-slate-800 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-center ${details.bgColor}`}>
                    {details.icon}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">{details.label}</span>
                    <span className="text-[10px] text-slate-500 block font-mono mt-0.5">Ref: {tx.id.slice(0, 13)}...</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-sm font-bold block ${
                    tx.amountPesewas > 0 ? "text-emerald-400" : "text-slate-200"
                  }`}>
                    {details.amountFormatted}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No transactions recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
