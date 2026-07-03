"use client";

import { useState } from "react";
import { createIndependentStoreAction } from "@/app/actions/multi-store";
import { ShieldAlert, CheckCircle2, Store } from "lucide-react";

export default function AddStoreForm({
  cooldownActive,
  cooldownText,
  limitReached,
}: {
  cooldownActive: boolean;
  cooldownText: string;
  limitReached: boolean;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached || cooldownActive) return;

    setError("");
    setLoading(true);

    try {
      const res = await createIndependentStoreAction({ name, displayName });
      setLoading(false);

      if (res.success) {
        setSuccess(true);
        // Reload to update dashboard lists and activate new store context
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(res.error || "Failed to create store.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  if (limitReached) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center leading-relaxed">
        <Store className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        You have reached the maximum limit of <span className="font-bold text-white">5 stores</span>. 
        You cannot self-serve create any more stores.
      </div>
    );
  }

  if (cooldownActive) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center leading-relaxed">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <span className="font-bold text-amber-400">Creation Cooldown Active:</span>
        <p className="mt-1">{cooldownText}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs leading-relaxed">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3 animate-bounce" />
        <h3 className="font-bold text-white text-sm">Store Created Successfully!</h3>
        <p className="text-slate-400 mt-1">Activating context and reloading dashboard page...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Store className="w-4 h-4 text-indigo-400" />
        Create Standalone Independent Store
      </h3>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Instantly launch a separate storefront under your ownership. It will buy data bundles at supplier wholesale rates and operate fully independently.
      </p>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] leading-relaxed flex gap-2 items-center">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Store Code Name (slug-friendly)
        </label>
        <input
          type="text"
          required
          placeholder="e.g. My Next Store"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white placeholder-slate-800 font-medium"
        />
      </div>

      <div>
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Store Display Name (public customer branding)
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Apex Mobile Data Hub"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white placeholder-slate-800 font-medium"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
      >
        {loading ? "Creating shop..." : "Add Store"}
      </button>
    </form>
  );
}
