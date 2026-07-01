"use client";

import { useState } from "react";
import { requestPayoutAction } from "@/app/actions/commission";
import { DollarSign } from "lucide-react";

export function PayoutButton({
  approvedBalancePesewas,
}: {
  approvedBalancePesewas: number;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const threshold = 2000; // GH₵20.00
  const canRequest = approvedBalancePesewas >= threshold;

  const handleRequest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await requestPayoutAction();
      if (res.success) {
        setMessage({
          type: "success",
          text: `Payout request submitted successfully!`,
        });
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to submit payout request.",
        });
      }
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "An error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleRequest}
        disabled={loading || !canRequest}
        className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-[0.98] ${
          canRequest
            ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60"
        }`}
      >
        <DollarSign className="w-3.5 h-3.5" />
        {loading ? "Submitting..." : "Request Payout"}
      </button>

      {message && (
        <p
          className={`text-xs font-medium ${
            message.type === "success" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {!canRequest && (
        <p className="text-[10px] text-slate-500 italic">
          Minimum payout threshold is GH₵20.00. Current: GH₵{(approvedBalancePesewas / 100).toFixed(2)}
        </p>
      )}
    </div>
  );
}
