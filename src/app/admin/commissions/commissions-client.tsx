"use client";

import { useState } from "react";
import { approveCommissionsAction, payoutAgentBatchAction } from "@/app/actions/commission";
import { Check, CreditCard, ShieldAlert, DollarSign } from "lucide-react";

export function CommissionsClient({
  pendingCommissions,
  pendingBatches,
}: {
  pendingCommissions: any[];
  pendingBatches: any[];
}) {
  const [selectedCommIds, setSelectedCommIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  
  const [activeBatch, setActiveBatch] = useState<any | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"manual_momo" | "manual_bank">("manual_momo");
  const [payoutReference, setPayoutReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedCommIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCommIds.length === pendingCommissions.length) {
      setSelectedCommIds([]);
    } else {
      setSelectedCommIds(pendingCommissions.map((c) => c.id));
    }
  };

  const handleApproveBulk = async () => {
    if (selectedCommIds.length === 0) return;
    setApproving(true);
    setMessage(null);
    try {
      const res = await approveCommissionsAction(selectedCommIds);
      if (res.success) {
        setMessage({ type: "success", text: `Successfully approved ${selectedCommIds.length} commissions.` });
        setSelectedCommIds([]);
      } else {
        setMessage({ type: "error", text: res.error || "Approval failed." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "An error occurred." });
    } finally {
      setApproving(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;
    setPaying(true);
    setMessage(null);
    try {
      const res = await payoutAgentBatchAction(activeBatch.id, payoutMethod, payoutReference, notes);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Batch payout marked as completed. Reference: ${payoutReference}`,
        });
        setActiveBatch(null);
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

      {/* Bulk Approval Section */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Unapproved Commissions</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select pending reseller earnings below to batch approve them for withdrawal.
            </p>
          </div>
          {selectedCommIds.length > 0 && (
            <button
              onClick={handleApproveBulk}
              disabled={approving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" />
              {approving ? "Approving..." : `Approve Selected (${selectedCommIds.length})`}
            </button>
          )}
        </div>

        {pendingCommissions.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No pending commissions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                  <th className="pb-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedCommIds.length === pendingCommissions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 bg-slate-950"
                    />
                  </th>
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Sale Amount</th>
                  <th className="pb-3">Commission</th>
                  <th className="pb-3">Earned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-medium">
                {pendingCommissions.map((c) => (
                  <tr key={c.id} className="text-slate-300 hover:text-white transition">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selectedCommIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 bg-slate-950"
                      />
                    </td>
                    <td className="py-3 font-semibold text-slate-200">
                      {c.agentUser.name} <span className="text-[10px] text-slate-500 font-normal">({c.agentUser.email})</span>
                    </td>
                    <td className="py-3 font-mono">{c.orderId.slice(0, 8)}...</td>
                    <td className="py-3">GH₵{(c.salePricePesewas / 100).toFixed(2)}</td>
                    <td className="py-3 font-bold text-indigo-400">
                      GH₵{(c.commissionAmountPesewas / 100).toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">({c.commissionRatePercent}%)</span>
                    </td>
                    <td className="py-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Batches Section */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Pending Payout Batches</h3>
        <p className="text-xs text-slate-400 mb-6">
          Review withdrawal requests from agents. Mark them as paid manually after sending their Mobile Money or Bank transfers.
        </p>

        {pendingBatches.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No pending payout batches found.</p>
        ) : (
          <div className="space-y-4">
            {pendingBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-750 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white">{batch.agentUser.name}</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Pending Payout
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p>Agent Contact: <span className="text-slate-300 font-semibold">{batch.agentUser.phone || "No phone"}</span> ({batch.agentUser.email})</p>
                    <p>Includes <span className="text-slate-300 font-semibold">{batch.commissions.length}</span> individual commission items</p>
                    <p className="text-[10px] text-slate-500">Requested: {new Date(batch.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 self-stretch md:self-center shrink-0 border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block text-right uppercase">Owed Balance</span>
                    <span className="text-xl font-black text-emerald-400">GH₵{(batch.totalAmountPesewas / 100).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setActiveBatch(batch)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 active:scale-[0.98]"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Mark as Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attestation Confirmation Modal */}
      {activeBatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Confirm Manual Payout
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Attest that you have transferred <span className="text-emerald-400 font-bold">GH₵{(activeBatch.totalAmountPesewas / 100).toFixed(2)}</span> to <span className="text-white font-semibold">{activeBatch.agentUser.name}</span>. This will set all commissions to Paid.
            </p>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Payout Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("manual_momo")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      payoutMethod === "manual_momo"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/85"
                    }`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("manual_bank")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      payoutMethod === "manual_bank"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/85"
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

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
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Internal Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Paid to MTN wallet number 024xxxxxxx"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBatch(null);
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
