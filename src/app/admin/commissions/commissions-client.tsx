"use client";

import { useState } from "react";
import { payoutWithdrawalAction, rejectWithdrawalAction } from "@/app/actions/commission";
import { Check, CreditCard, ShieldAlert, DollarSign, X } from "lucide-react";
import { formatPesewas } from "@/lib/site-config";

export function CommissionsClient({
  pendingWithdrawals,
}: {
  pendingWithdrawals: any[];
}) {
  const [activeWithdrawal, setActiveWithdrawal] = useState<any | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWithdrawal) return;
    setPaying(true);
    setMessage(null);
    try {
      const res = await payoutWithdrawalAction(activeWithdrawal.id, payoutReference, notes);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Withdrawal marked as completed. Reference: ${payoutReference}`,
        });
        setActiveWithdrawal(null);
        setPayoutReference("");
        setNotes("");
      } else {
        setMessage({ type: "error", text: res.error || "Payout recording failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setPaying(false);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!confirm("Are you sure you want to reject this request? Locked ledger amounts will be released back to the agent.")) {
      return;
    }
    setRejecting(true);
    setMessage(null);
    try {
      const res = await rejectWithdrawalAction(withdrawalId);
      if (res.success) {
        setMessage({ type: "success", text: "Withdrawal request rejected successfully." });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to reject request." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Payout Withdrawals Section */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Pending Reseller Cash-outs</h3>
        <p className="text-xs text-slate-400 mb-6">
          Review withdrawal requests from agents. Mark them as paid manually after sending Mobile Money or Bank transfers.
        </p>

        {pendingWithdrawals.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No pending payout requests found.</p>
        ) : (
          <div className="space-y-4">
            {pendingWithdrawals.map((w) => (
              <div
                key={w.id}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-750 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white">{w.store.displayName || w.store.name}</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {w.payoutMethod}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p>Store Slug: <span className="text-slate-300 font-semibold">/shop/{w.store.slug}</span></p>
                    <p className="text-[10px] text-slate-500">Requested: {new Date(w.requestedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-stretch md:self-center shrink-0 border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Owed Balance</span>
                    <span className="text-xl font-black text-emerald-400">{formatPesewas(w.amountPesewas)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveWithdrawal(w)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Payout
                    </button>
                    <button
                      onClick={() => handleReject(w.id)}
                      disabled={rejecting}
                      className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-450 border border-rose-500/25 font-bold rounded-xl text-xs transition flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attestation Confirmation Modal */}
      {activeWithdrawal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Confirm Cash Out Payout
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Attest that you have transferred <span className="text-emerald-400 font-bold">{formatPesewas(activeWithdrawal.amountPesewas)}</span>. This will set status to Completed.
            </p>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Transaction Reference / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MoMo Transaction ID"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Internal Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Paid to MTN MoMo account"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWithdrawal(null);
                    setPayoutReference("");
                    setNotes("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-950 transition active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  <Check className="w-3.5 h-3.5" />
                  {paying ? "Recording..." : "I Confirm Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
