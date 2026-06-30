"use client";

import { useState } from "react";
import { retrySupplierOrderAction, updateOrderManualStatusAction } from "@/app/actions/admin";
import { formatPesewas } from "@/lib/site-config";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Search, Play } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  userId: string | null;
  bundleId: string;
  recipientPhone: string;
  status: string;
  supplierOrderRef: string | null;
  paystackRef: string | null;
  amountPaid: number;
  createdAt: Date;
  bundle: {
    label: string;
    network: string;
  };
  user: {
    email: string;
  } | null;
}

export default function AdminOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleRetryOrder = async (orderId: string) => {
    setActionLoadingId(orderId);
    const res = await retrySupplierOrderAction(orderId);
    setActionLoadingId(null);

    if (res.success && res.order) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: res.order!.status, supplierOrderRef: res.order!.supplierOrderRef }
            : o
        )
      );
    } else {
      alert(res.error || "Retry failed.");
    }
  };

  const handleStatusOverride = async (orderId: string, newStatus: string) => {
    setActionLoadingId(orderId);
    const res = await updateOrderManualStatusAction(orderId, newStatus);
    setActionLoadingId(null);

    if (res.success && res.status) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: res.status! } : o))
      );
    } else {
      alert(res.error || "Failed to update status.");
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.recipientPhone.includes(searchTerm) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.supplierOrderRef && o.supplierOrderRef.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5" /> Delivered
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-2.5 h-2.5" /> Failed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Clock className="w-2.5 h-2.5" /> Processing
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-2.5 h-2.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <h3 className="font-bold text-white mb-6">Order Control Room</h3>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by Phone number, Order ID, or Supplier ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs transition text-white placeholder-slate-600 font-medium"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "PENDING", "PROCESSING", "DELIVERED", "FAILED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                statusFilter === status
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  : "border-slate-800 bg-slate-950 text-slate-550 hover:border-slate-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
              <th className="pb-3">Recipient</th>
              <th className="pb-3">Bundle info</th>
              <th className="pb-3">Charged</th>
              <th className="pb-3">Current Status</th>
              <th className="pb-3">Supplier Ref</th>
              <th className="pb-3">Payment Info</th>
              <th className="pb-3">Override Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredOrders.map((o) => {
              const isActioning = actionLoadingId === o.id;

              return (
                <tr key={o.id} className="text-slate-300 hover:text-white transition">
                  <td className="py-4">
                    <span className="font-bold text-white block font-mono">{o.recipientPhone}</span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[120px] font-mono mt-0.5">ID: {o.id.slice(0, 10)}...</span>
                  </td>
                  <td className="py-4">
                    <span className="font-bold text-white block">[{o.bundle.network}] {o.bundle.label}</span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[100px] mt-0.5">{o.user?.email || "Guest Purchase"}</span>
                  </td>
                  <td className="py-4 font-mono font-bold text-white">{formatPesewas(o.amountPaid)}</td>
                  <td className="py-4">{getStatusBadge(o.status)}</td>
                  <td className="py-4 font-mono text-[10px] text-slate-400">{o.supplierOrderRef || "—"}</td>
                  <td className="py-4 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">{o.paystackRef || "Wallet Payment"}</td>
                  <td className="py-4">
                    <select
                      value={o.status}
                      disabled={isActioning}
                      onChange={(e) => handleStatusOverride(o.id, e.target.value)}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleRetryOrder(o.id)}
                        disabled={isActioning || o.status === "DELIVERED"}
                        className="p-2 rounded-lg bg-indigo-900/30 border border-indigo-700/20 text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                        title="Resend to Supplier API"
                      >
                        <RefreshCw className={`w-3 h-3 ${isActioning ? "animate-spin" : ""}`} />
                        Retry Sync
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  No matching orders logged in the console.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
