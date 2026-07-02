"use client";

import { useState } from "react";
import { updateStorePricingAction } from "@/app/actions/store";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { formatPesewas } from "@/lib/site-config";

interface Bundle {
  id: string;
  network: string;
  label: string;
  sellPricePesewas: number;
  agentPricePesewas: number;
}

interface StorePricing {
  bundleId: string;
  priceForCustomersPesewas: number;
  priceForSubAgentsPesewas: number;
}

interface CostFloor {
  bundleId: string;
  costFloor: number;
}

export default function PricingGrid({
  store,
  bundles,
  pricings,
  costs,
}: {
  store: { id: string };
  bundles: Bundle[];
  pricings: StorePricing[];
  costs: CostFloor[];
}) {
  const [grid, setGrid] = useState(
    bundles.map((bundle) => {
      const match = pricings.find((p) => p.bundleId === bundle.id);
      const costMatch = costs.find((c) => c.bundleId === bundle.id);
      const costFloor = costMatch ? costMatch.costFloor : bundle.sellPricePesewas;

      return {
        bundleId: bundle.id,
        network: bundle.network,
        label: bundle.label,
        costFloor,
        customerPrice: match ? match.priceForCustomersPesewas / 100 : bundle.sellPricePesewas / 100,
        subAgentPrice: match ? match.priceForSubAgentsPesewas / 100 : bundle.agentPricePesewas / 100,
      };
    })
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (bundleId: string, field: "customerPrice" | "subAgentPrice", val: string) => {
    setGrid((prev) =>
      prev.map((item) => {
        if (item.bundleId === bundleId) {
          return {
            ...item,
            [field]: val === "" ? 0 : parseFloat(val),
          };
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    // Frontend validations
    for (const item of grid) {
      const costFloor = item.costFloor;
      if (item.customerPrice * 100 < costFloor) {
        setLoading(false);
        setMessage({
          type: "error",
          text: `Customer Price for ${item.label} cannot be lower than cost floor of GH₵ ${(costFloor / 100).toFixed(2)}`,
        });
        return;
      }
      if (item.subAgentPrice * 100 < costFloor) {
        setLoading(false);
        setMessage({
          type: "error",
          text: `Sub-Agent Price for ${item.label} cannot be lower than cost floor of GH₵ ${(costFloor / 100).toFixed(2)}`,
        });
        return;
      }
    }

    try {
      const res = await updateStorePricingAction(
        store.id,
        grid.map((item) => ({
          bundleId: item.bundleId,
          priceForCustomersPesewas: Math.round(item.customerPrice * 100),
          priceForSubAgentsPesewas: Math.round(item.subAgentPrice * 100),
        }))
      );

      setLoading(false);
      if (res.success) {
        setMessage({ type: "success", text: "Store bundle prices saved successfully!" });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update pricing grid." });
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
              <th className="pb-3">Network</th>
              <th className="pb-3">Bundle Description</th>
              <th className="pb-3 text-right">Cost Floor (Buy)</th>
              <th className="pb-3 text-right">Customer Price (GH₵)</th>
              <th className="pb-3 text-right font-bold text-indigo-400">Sub-Agent Price (GH₵)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {grid.map((item) => (
              <tr key={item.bundleId} className="text-slate-300 hover:text-white transition">
                <td className="py-3 font-bold text-xs uppercase text-slate-400">{item.network}</td>
                <td className="py-3 text-xs">{item.label}</td>
                <td className="py-3 text-right text-xs text-rose-400 font-bold">
                  {formatPesewas(item.costFloor)}
                </td>
                <td className="py-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min={item.costFloor / 100}
                    value={item.customerPrice}
                    onChange={(e) => handleChange(item.bundleId, "customerPrice", e.target.value)}
                    className="w-24 text-right px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:border-indigo-500"
                  />
                </td>
                <td className="py-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min={item.costFloor / 100}
                    value={item.subAgentPrice}
                    onChange={(e) => handleChange(item.bundleId, "subAgentPrice", e.target.value)}
                    className="w-24 text-right px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:border-indigo-500 text-indigo-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-bold rounded-2xl text-xs transition shadow-lg shrink-0 cursor-pointer"
      >
        {loading ? "Saving settings..." : "Save Pricing Changes"}
      </button>
    </div>
  );
}
