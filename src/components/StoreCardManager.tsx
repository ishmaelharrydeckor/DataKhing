"use client";

import { useState } from "react";
import { switchActiveStoreAction } from "@/app/actions/multi-store";
import { CheckCircle2, AlertCircle, Play, Bookmark } from "lucide-react";

interface SerializedStore {
  id: string;
  name: string;
  slug: string;
  status: string;
  storeType: string;
  createdAt: Date;
}

export default function StoreCardManager({
  store,
  isActive,
}: {
  store: SerializedStore;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    if (isActive) return;
    setLoading(true);

    const res = await switchActiveStoreAction(store.id);
    setLoading(false);

    if (res.success) {
      // Reload to propagate context
      window.location.href = "/agent/dashboard";
    } else {
      alert(res.error || "Failed to switch active store context.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Suspended
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pending
          </span>
        );
    }
  };

  return (
    <div
      className={`p-5 rounded-3xl bg-slate-900 border transition flex flex-col justify-between h-48 relative overflow-hidden ${
        isActive ? "border-indigo-500 shadow-lg shadow-indigo-600/5" : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-indigo-400 font-bold text-[9px] uppercase tracking-wider">
          <Bookmark className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
          Active Shop
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-sm font-extrabold text-white truncate max-w-[150px]">
            {store.name}
          </h4>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
            {store.storeType}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Slug: /{store.slug}</p>
        <p className="text-[10px] text-slate-650 mt-1">
          Created: {new Date(store.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-950">
        <div>{getStatusBadge(store.status)}</div>
        
        <button
          onClick={handleSwitch}
          disabled={isActive || loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-[0.98] ${
            isActive
              ? "bg-slate-950 text-slate-500 cursor-not-allowed border border-slate-900"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 cursor-pointer"
          }`}
        >
          <Play className="w-3 h-3" />
          {loading ? "Switching..." : isActive ? "Current context" : "Manage"}
        </button>
      </div>
    </div>
  );
}
