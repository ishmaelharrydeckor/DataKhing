"use client";

import { useState } from "react";
import { topupWalletAction } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { formatPesewas } from "@/lib/site-config";
import { Wallet, ShieldAlert } from "lucide-react";

export default function WalletTopupForm() {
  const router = useRouter();
  const [amountGHS, setAmountGHS] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const presetAmounts = [10, 20, 50, 100];

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const value = parseFloat(amountGHS);
    if (isNaN(value) || value <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    setLoading(true);
    // Convert to lowest currency unit (pesewas)
    const amountPesewas = Math.floor(value * 100);

    const res = await topupWalletAction(amountPesewas);
    setLoading(false);

    if (res.success && res.checkoutUrl) {
      router.push(res.checkoutUrl);
    } else {
      setError(res.error || "Failed to initialize top-up.");
    }
  };

  return (
    <form onSubmit={handleTopup} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Suggested quick topups */}
      <div>
        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-2">Quick Select</label>
        <div className="grid grid-cols-4 gap-2">
          {presetAmounts.map((amt) => (
            <button
              type="button"
              key={amt}
              onClick={() => setAmountGHS(amt.toString())}
              className={`py-2 px-1 text-center font-bold text-xs rounded-xl border transition cursor-pointer ${
                amountGHS === amt.toString()
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
              }`}
            >
              GH₵{amt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1.5">Or Enter Custom Amount (GHS)</label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-slate-500 font-bold text-sm">GH₵</span>
          <input
            type="number"
            step="0.01"
            min="1"
            placeholder="0.00"
            value={amountGHS}
            onChange={(e) => setAmountGHS(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition text-white placeholder-slate-700 font-bold"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Initializing secure channel...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            Top-Up Wallet Now
          </>
        )}
      </button>
    </form>
  );
}
