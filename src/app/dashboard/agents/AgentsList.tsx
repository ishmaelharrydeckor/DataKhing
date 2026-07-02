"use client";

import { useState } from "react";
import { toggleStoreSuspensionAction } from "@/app/actions/store";
import { Play, Pause, Smartphone } from "lucide-react";
import { formatPesewas } from "@/lib/site-config";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  status: string;
  createdAt: Date;
  orders: {
    id: string;
    amountPaid: number;
  }[];
  ledgers: {
    amountPesewas: number;
  }[];
}

export default function AgentsList({ stores }: { stores: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleSuspension = async (storeId: string, currentStatus: string) => {
    setLoadingId(storeId);
    const shouldSuspend = currentStatus === "ACTIVE";
    const res = await toggleStoreSuspensionAction(storeId, shouldSuspend);
    setLoadingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to toggle store status.");
    }
  };

  if (stores.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs italic">
        You have no registered sub-agents yet. Share your become-a-reseller link to recruit partners!
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
              <th className="p-4 sm:p-5">Store Name</th>
              <th className="p-4 sm:p-5">Joined Date</th>
              <th className="p-4 sm:p-5">Orders</th>
              <th className="p-4 sm:p-5">Revenue Vol</th>
              <th className="p-4 sm:p-5">Status</th>
              <th className="p-4 sm:p-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {stores.map((store) => {
              const orderCount = store.orders.length;
              const revenuePesewas = store.orders.reduce((sum: number, o: any) => sum + o.amountPaid, 0);
              const isActive = store.status === "ACTIVE";

              return (
                <tr key={store.id} className="text-slate-300 hover:text-white transition">
                  <td className="p-4 sm:p-5">
                    <div className="font-bold text-white text-sm">{store.displayName || store.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">/shop/{store.slug}</div>
                  </td>
                  <td className="p-4 sm:p-5 text-slate-400">
                    {new Date(store.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 sm:p-5 text-slate-200 font-bold">{orderCount}</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">{formatPesewas(revenuePesewas)}</td>
                  <td className="p-4 sm:p-5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td className="p-4 sm:p-5 text-right">
                    <button
                      onClick={() => handleToggleSuspension(store.id, store.status)}
                      disabled={loadingId === store.id}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] cursor-pointer inline-flex items-center gap-1 shadow-md ${
                        isActive
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          {loadingId === store.id ? "Working..." : "Suspend"}
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          {loadingId === store.id ? "Working..." : "Reactivate"}
                        </>
                      )}
                    </button>
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
