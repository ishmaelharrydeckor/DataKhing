"use client";

import { useState } from "react";
import { requestWithdrawalAction } from "@/app/actions/commission";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WithdrawalsForm({
  storeId,
  availableBalancePesewas,
}: {
  storeId: string;
  availableBalancePesewas: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"MANUAL_MOMO" | "MANUAL_BANK" | "PAYSTACK_TRANSFER">("MANUAL_MOMO");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const thresholdPesewas = 2000; // GH₵20.00
  const canRequest = availableBalancePesewas >= thresholdPesewas;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const valPesewas = Math.round(parseFloat(amount) * 100);

    if (valPesewas > availableBalancePesewas) {
      setLoading(false);
      setMessage({ type: "error", text: "Withdrawal amount exceeds your available balance." });
      return;
    }

    if (valPesewas < thresholdPesewas) {
      setLoading(false);
      setMessage({ type: "error", text: `Minimum withdrawal amount is GH₵ ${(thresholdPesewas / 100).toFixed(2)}.` });
      return;
    }

    try {
      const res = await requestWithdrawalAction(storeId, valPesewas, payoutMethod);
      setLoading(false);

      if (res.success) {
        setMessage({ type: "success", text: "Withdrawal request submitted successfully!" });
        setAmount("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.error || "Failed to submit withdrawal request." });
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
      {message && (
        <div
          className={`p-4 rounded-xl flex gap-2 items-center text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/25 text-rose-400"
          }`}
        >
          {message.type === "success" ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Withdrawal Amount (GH₵)
          </label>
          <input
            type="number"
            step="0.01"
            required
            disabled={!canRequest}
            placeholder="e.g. 50.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white placeholder-slate-800"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Payout Method
          </label>
          <select
            value={payoutMethod}
            disabled={!canRequest}
            onChange={(e: any) => setPayoutMethod(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-slate-300 font-medium"
          >
            <option value="MANUAL_MOMO">Mobile Money (Manual)</option>
            <option value="MANUAL_BANK">Bank Transfer (Manual)</option>
            <option value="PAYSTACK_TRANSFER">Paystack Automated Transfer</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !canRequest || !amount}
        className={`w-full py-3.5 text-white font-bold rounded-2xl text-xs transition shadow-lg shrink-0 flex items-center justify-center gap-2 ${
          canRequest && amount
            ? "bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        {loading ? "Submitting request..." : "Request Cash Out"}
      </button>
    </form>
  );
}
