"use client";

import { useState } from "react";
import { switchActiveStoreAction } from "@/app/actions/multi-store";
import { LayoutGrid, Check, ChevronDown } from "lucide-react";

interface SimpleStore {
  id: string;
  name: string;
  slug: string;
}

export default function StoreSwitcher({
  stores,
  activeStoreId,
}: {
  stores: SimpleStore[];
  activeStoreId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  const handleSelect = async (storeId: string) => {
    if (storeId === activeStoreId) {
      setOpen(false);
      return;
    }

    setLoading(true);
    const res = await switchActiveStoreAction(storeId);
    setLoading(false);
    setOpen(false);

    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to switch store context.");
    }
  };

  if (stores.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
        <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
        <span>{activeStore.name}</span>
        <span className="text-slate-600 font-normal">({activeStore.slug})</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
          <span>{activeStore.name}</span>
          <span className="text-slate-600 font-normal">({activeStore.slug})</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-100">
            <span className="block px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Switch Dashboard Context
            </span>
            <div className="space-y-1 mt-1">
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-950 transition cursor-pointer"
                >
                  <div className="truncate max-w-[180px]">
                    <p className="truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-550 font-normal truncate">/{s.slug}</p>
                  </div>
                  {s.id === activeStoreId && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
