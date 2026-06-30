"use client";

import { useState } from "react";
import { adjustUserWalletAction } from "@/app/actions/admin";
import { formatPesewas } from "@/lib/site-config";
import { Search, DollarSign, UserCheck, ShieldAlert } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  walletBalance: number;
  referralCode: string;
  createdAt: Date;
}

export default function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Wallet Adjust state
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [amountGHS, setAmountGHS] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdjustBalance = async (userId: string) => {
    const amtValue = parseFloat(amountGHS);
    if (isNaN(amtValue) || amtValue === 0) {
      alert("Please enter a valid positive or negative GHS amount.");
      return;
    }

    if (!adjustReason.trim()) {
      alert("An audit reason is required to adjust user funds.");
      return;
    }

    setSaving(true);
    const amountPesewas = Math.floor(amtValue * 100);
    const res = await adjustUserWalletAction(userId, amountPesewas, adjustReason);
    setSaving(false);

    if (res.success && res.newBalance !== undefined) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, walletBalance: res.newBalance! } : u))
      );
      setAdjustingId(null);
      setAmountGHS("");
      setAdjustReason("");
    } else {
      alert(res.error || "Failed to adjust balance.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const nameStr = u.name || "";
    const phoneStr = u.phone || "";
    return (
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm)
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <h3 className="font-bold text-white mb-6">User Wallets & Audit Accounts</h3>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Filter accounts by Name, Email, or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs transition text-white placeholder-slate-650 font-medium"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
              <th className="pb-3">Account Details</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Phone</th>
              <th className="pb-3">Wallet Balance</th>
              <th className="pb-3">Referral Key</th>
              <th className="pb-3 text-right">Wallet Tuning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredUsers.map((u) => {
              const isAdjusting = adjustingId === u.id;

              return (
                <tr key={u.id} className="text-slate-350 hover:text-white transition">
                  <td className="py-4">
                    <span className="font-bold text-white block">{u.name || "Unnamed"}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{u.email}</span>
                  </td>
                  <td className="py-4">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      u.role === "ADMIN" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      u.role === "AGENT" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                      "bg-slate-850 text-slate-400 border-slate-800"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 font-mono">{u.phone || "—"}</td>
                  <td className="py-4 font-bold text-white">{formatPesewas(u.walletBalance)}</td>
                  <td className="py-4 font-mono font-semibold text-indigo-400">{u.referralCode}</td>
                  <td className="py-4 text-right">
                    {isAdjusting ? (
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-3 max-w-[280px] ml-auto text-left">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Adjustment (GHS)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. +50 or -15"
                            value={amountGHS}
                            onChange={(e) => setAmountGHS(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Reason for Audit</label>
                          <input
                            type="text"
                            placeholder="e.g. Manual topup error"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-700 font-medium"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleAdjustBalance(u.id)}
                            disabled={saving}
                            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => setAdjustingId(null)}
                            className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdjustingId(u.id);
                          setAmountGHS("");
                          setAdjustReason("");
                        }}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-indigo-400 font-bold text-[10px] rounded-xl border border-indigo-500/10 cursor-pointer inline-flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Adjust Balance
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
