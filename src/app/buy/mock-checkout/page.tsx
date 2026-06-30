"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { Smartphone, CheckCircle, XCircle } from "lucide-react";

function MockCheckoutComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get("reference") || "";
  const amountStr = searchParams.get("amount") || "0";
  const email = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const amountPesewas = parseInt(amountStr, 10);
  const [loading, setLoading] = useState<"success" | "fail" | null>(null);

  const handleSimulatePayment = (success: boolean) => {
    setLoading(success ? "success" : "fail");
    
    // Simulate brief payment processing time
    setTimeout(() => {
      const targetRef = success ? reference : `${reference}-FAIL`;
      // Redirect to callbackUrl
      const url = new URL(callbackUrl, window.location.origin);
      url.searchParams.set("reference", targetRef);
      router.push(url.pathname + url.search);
    }, 1500);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Decorative ambient background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="text-center mb-8 relative">
          <div className="inline-flex p-3 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 mb-4 animate-bounce">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mock Checkout Gateway</h1>
          <p className="text-sm text-slate-400 mt-1">Simulated Mobile Money Payment channel</p>
        </div>

        <div className="space-y-4 bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 mb-8 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Merchant:</span>
            <span className="font-semibold text-white">{SITE_CONFIG.SITE_NAME}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Reference:</span>
            <span className="font-mono text-xs text-indigo-300">{reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Customer:</span>
            <span className="text-white truncate max-w-[200px]">{email}</span>
          </div>
          <div className="border-t border-slate-800/60 my-2 pt-2 flex justify-between items-center">
            <span className="text-slate-400 font-medium">Amount Due:</span>
            <span className="text-xl font-bold text-white">{formatPesewas(amountPesewas)}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300">
              {loading === "success" 
                ? "Simulating successful Mobile Money pin validation..." 
                : "Processing network error simulation..."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleSimulatePayment(true)}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition duration-200 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              <CheckCircle className="w-5 h-5" />
              Simulate Payment Success
            </button>
            <button
              onClick={() => handleSimulatePayment(false)}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold rounded-2xl transition duration-200 cursor-pointer border border-rose-500/20 active:scale-[0.98]"
            >
              <XCircle className="w-5 h-5" />
              Simulate Payment Failure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse">Loading checkout window...</div>
      </div>
    }>
      <MockCheckoutComponent />
    </Suspense>
  );
}
