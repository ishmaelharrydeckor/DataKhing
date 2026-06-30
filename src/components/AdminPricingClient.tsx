"use client";

import { useState } from "react";
import { updateBundlePricesAction, getSupplierCatalogDiffAction, applyCatalogSyncAction } from "@/app/actions/admin";
import { formatPesewas, NetworkType } from "@/lib/site-config";
import { Edit3, Check, RefreshCw, AlertCircle, RefreshCcw } from "lucide-react";

interface Bundle {
  id: string;
  network: string;
  label: string;
  dataAmountGB: number;
  supplierCostPesewas: number;
  sellPricePesewas: number;
  agentPricePesewas: number;
  active: boolean;
}

export default function AdminPricingClient({ initialBundles }: { initialBundles: Bundle[] }) {
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("MTN");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form edit states
  const [sellPriceGHS, setSellPriceGHS] = useState("");
  const [agentPriceGHS, setAgentPriceGHS] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync catalog states
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDiff, setSyncDiff] = useState<any>(null);
  const [syncMessage, setSyncMessage] = useState("");

  const filteredBundles = bundles.filter((b) => b.network === selectedNetwork && b.active);

  const startEditing = (b: Bundle) => {
    setEditingId(b.id);
    setSellPriceGHS((b.sellPricePesewas / 100).toFixed(2));
    setAgentPriceGHS((b.agentPricePesewas / 100).toFixed(2));
  };

  const handleSavePrice = async (bundleId: string) => {
    const sell = Math.floor(parseFloat(sellPriceGHS) * 100);
    const agent = Math.floor(parseFloat(agentPriceGHS) * 100);

    if (isNaN(sell) || isNaN(agent) || sell <= 0 || agent <= 0) {
      alert("Invalid price values entered.");
      return;
    }

    setSaving(true);
    const res = await updateBundlePricesAction(bundleId, sell, agent);
    setSaving(false);

    if (res.success && res.bundle) {
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, sellPricePesewas: sell, agentPricePesewas: agent } : b))
      );
      setEditingId(null);
    } else {
      alert(res.error || "Failed to update prices.");
    }
  };

  const handleFetchSyncDiff = async () => {
    setSyncLoading(true);
    setSyncMessage("");
    setSyncDiff(null);

    const res = await getSupplierCatalogDiffAction();
    setSyncLoading(false);

    if (res.success && res.diff) {
      setSyncDiff(res.diff);
      const totalChanges = res.diff.newItems.length + res.diff.updatedItems.length + res.diff.removedItems.length;
      if (totalChanges === 0) {
        setSyncMessage("Local catalog is already fully up-to-date with upstream supplier. No sync needed.");
        setSyncDiff(null);
      }
    } else {
      setSyncMessage(res.error || "Failed to query supplier catalog.");
    }
  };

  const handleApplySync = async () => {
    if (!syncDiff) return;
    setSyncLoading(true);
    const res = await applyCatalogSyncAction(syncDiff);
    setSyncLoading(false);

    if (res.success) {
      setSyncDiff(null);
      setSyncMessage("Catalog synced successfully! Reload page to view updated bundle listings.");
      window.location.reload();
    } else {
      alert(res.error || "Failed to apply catalog sync.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Catalog Sync triggers */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-white">Supplier Catalog Sync</h3>
            <p className="text-xs text-slate-400 mt-1">Check for new, removed, or updated bundles from the upstream client catalog.</p>
          </div>
          <button
            onClick={handleFetchSyncDiff}
            disabled={syncLoading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`} />
            Check Supplier Catalog
          </button>
        </div>

        {syncMessage && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-indigo-400 font-medium">
            {syncMessage}
          </div>
        )}

        {/* Diff view */}
        {syncDiff && (
          <div className="mt-6 border-t border-slate-850 pt-6 space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-300">
              <AlertCircle className="w-5 h-5 text-indigo-400 inline mr-2 shrink-0" />
              Please review the changes below from the supplier before applying the sync.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <h4 className="font-bold text-emerald-400 uppercase mb-2">New Bundles ({syncDiff.newItems.length})</h4>
                <ul className="space-y-2">
                  {syncDiff.newItems.map((item: any, i: number) => (
                    <li key={i} className="text-slate-400">
                      [{item.network}] <span className="text-white font-semibold">{item.label}</span>
                      <p className="text-[10px] mt-0.5">Supplier Cost: {formatPesewas(item.supplierCostPesewas)}</p>
                    </li>
                  ))}
                  {syncDiff.newItems.length === 0 && <span className="text-slate-650">None</span>}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <h4 className="font-bold text-amber-400 uppercase mb-2">Cost Updates ({syncDiff.updatedItems.length})</h4>
                <ul className="space-y-2">
                  {syncDiff.updatedItems.map((item: any, i: number) => (
                    <li key={i} className="text-slate-400">
                      [{item.network}] <span className="text-white font-semibold">{item.label}</span>
                      <p className="text-[10px] mt-0.5">
                        Cost: {formatPesewas(item.oldCost)} → <span className="text-amber-300 font-bold">{formatPesewas(item.newCost)}</span>
                      </p>
                    </li>
                  ))}
                  {syncDiff.updatedItems.length === 0 && <span className="text-slate-650">None</span>}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <h4 className="font-bold text-rose-500 uppercase mb-2">Removed Bundles ({syncDiff.removedItems.length})</h4>
                <ul className="space-y-2">
                  {syncDiff.removedItems.map((item: any, i: number) => (
                    <li key={i} className="text-slate-400">
                      [{item.network}] <span className="text-white font-semibold">{item.label}</span>
                    </li>
                  ))}
                  {syncDiff.removedItems.length === 0 && <span className="text-slate-650">None</span>}
                </ul>
              </div>
            </div>

            <button
              onClick={handleApplySync}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/25 active:scale-[0.98]"
            >
              Apply Supplier Changes
            </button>
          </div>
        )}
      </div>

      {/* Main pricing manager table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h3 className="font-bold text-white">Configure Markups & Markup Margin</h3>
          
          <div className="flex gap-2">
            {(["MTN", "TELECEL", "AIRTELTIGO"] as NetworkType[]).map((net) => (
              <button
                key={net}
                onClick={() => {
                  setSelectedNetwork(net);
                  setEditingId(null);
                }}
                className={`py-2 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  selectedNetwork === net
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                }`}
              >
                {net}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase">
                <th className="pb-3">Bundle Description</th>
                <th className="pb-3">Supplier Cost</th>
                <th className="pb-3">Retail Price (GHS)</th>
                <th className="pb-3">Agent Price (GHS)</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredBundles.map((b) => {
                const isEditing = editingId === b.id;

                return (
                  <tr key={b.id} className="text-slate-300 hover:text-white transition">
                    <td className="py-4 text-xs font-bold">{b.label}</td>
                    <td className="py-4 text-xs font-mono text-slate-500">{formatPesewas(b.supplierCostPesewas)}</td>
                    <td className="py-4 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-xs">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={sellPriceGHS}
                            onChange={(e) => setSellPriceGHS(e.target.value)}
                            className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-white font-bold">{formatPesewas(b.sellPricePesewas)}</span>
                      )}
                    </td>
                    <td className="py-4 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-xs">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={agentPriceGHS}
                            onChange={(e) => setAgentPriceGHS(e.target.value)}
                            className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-indigo-400 font-bold">{formatPesewas(b.agentPricePesewas)}</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleSavePrice(b.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                            title="Save Prices"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                            title="Cancel"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(b)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-705 text-indigo-400 cursor-pointer"
                          title="Edit Pricing"
                        >
                          <Edit3 className="w-4 h-4" />
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
    </div>
  );
}
