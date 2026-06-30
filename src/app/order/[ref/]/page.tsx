"use client";

import { useEffect, useState, use } from "react";
import { getOrderDetailsAction, pollOrderStatusAction } from "@/app/actions/orders";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { ShoppingBag, RefreshCw, CheckCircle2, XCircle, Clock, ArrowLeft, Phone, Zap } from "lucide-react";
import Link from "next/link";

export default function OrderTrackingPage({ params }: { params: Promise<{ ref: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.ref;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pollingStatus, setPollingStatus] = useState<string>("PENDING");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      const details = await getOrderDetailsAction(orderId);
      if (!active) return;
      
      if (!details) {
        setError("Order not found");
        setLoading(false);
        return;
      }
      setOrder(details);
      setPollingStatus(details.status);
      setLoading(false);
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  // Polling hook
  useEffect(() => {
    if (loading || !order) return;
    if (pollingStatus === "DELIVERED" || pollingStatus === "FAILED" || pollingStatus === "REFUNDED") return;

    const interval = setInterval(async () => {
      const res = await pollOrderStatusAction(orderId);
      if (res.success && res.status && res.status !== pollingStatus) {
        setPollingStatus(res.status);
        // Refresh details
        const details = await getOrderDetailsAction(orderId);
        if (details) setOrder(details);
      }
    }, 4000); // poll every 4 seconds

    return () => clearInterval(interval);
  }, [loading, order, pollingStatus, orderId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Fetching order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Order Not Found</h1>
          <p className="text-slate-400 text-sm mt-2">Could not find any order matching the reference: {orderId}</p>
          <Link href="/" className="inline-block mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-semibold text-sm transition">
            Go to Storefront
          </Link>
        </div>
      </div>
    );
  }

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return {
          icon: <CheckCircle2 className="w-16 h-16 text-emerald-400" />,
          title: "Order Fulfilled!",
          description: "Data has been successfully credited to the recipient's line.",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          progress: 100,
        };
      case "FAILED":
        return {
          icon: <XCircle className="w-16 h-16 text-rose-500" />,
          title: "Order Failed",
          description: "We encountered an upstream error. A refund will be credited to your account if applicable.",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          progress: 100,
        };
      case "PROCESSING":
        return {
          icon: <RefreshCw className="w-16 h-16 text-indigo-400 animate-spin" />,
          title: "Sending Data Upstream",
          description: "Upstream supplier is crediting the data bundle to the destination number.",
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
          progress: 60,
        };
      case "PENDING":
      default:
        return {
          icon: <Clock className="w-16 h-16 text-amber-400" />,
          title: "Order Initiated",
          description: "Awaiting payment verification or order confirmation.",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          progress: 25,
        };
    }
  };

  const statusInfo = getStatusDetails(pollingStatus);

  return (
    <div className="flex-1 bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Storefront
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />

          {/* Status Icon & Summary */}
          <div className="text-center pb-8 border-b border-slate-800">
            <div className="inline-block mb-4">{statusInfo.icon}</div>
            <h1 className="text-2xl font-bold text-white">{statusInfo.title}</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">{statusInfo.description}</p>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full mt-6 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${statusInfo.progress}%` }}
              />
            </div>
            {(pollingStatus === "PENDING" || pollingStatus === "PROCESSING") && (
              <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                Live Polling network status...
              </p>
            )}
          </div>

          {/* Order Details Grid */}
          <div className="py-8 space-y-4 text-sm border-b border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Order ID:</span>
              <span className="font-semibold text-white font-mono">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recipient Phone:</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                {order.recipientPhone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data Bundle:</span>
              <span className="font-bold text-white text-indigo-300">{order.bundle.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Network Provider:</span>
              <span className="font-bold text-white">{order.bundle.network}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Charged:</span>
              <span className="font-bold text-white">{formatPesewas(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Purchased On:</span>
              <span className="text-slate-300">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Upstream supplier reference, if exists */}
          {order.supplierOrderRef && (
            <div className="pt-6 pb-2 text-xs text-slate-500 flex justify-between">
              <span>Upstream Supplier Ref:</span>
              <span className="font-mono">{order.supplierOrderRef}</span>
            </div>
          )}

          <div className="pt-6">
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 flex gap-3 text-sm text-indigo-300">
              <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
              <p>
                A receipt has been sent to your email. You can bookmark this page to return and check status anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
