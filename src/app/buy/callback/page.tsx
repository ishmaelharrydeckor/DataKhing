"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { verifyOrderPaymentAction } from "@/app/actions/orders";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";

function CallbackComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [error, setError] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setError("No transaction reference supplied.");
      return;
    }

    let isMounted = true;

    async function verify() {
      const res = await verifyOrderPaymentAction(reference);
      if (!isMounted) return;

      if (res.success && res.orderId) {
        setStatus("success");
        setOrderId(res.orderId);
        // Automatically route to tracking page after 2 seconds
        setTimeout(() => {
          router.push(`/order/${res.orderId}`);
        }, 2000);
      } else {
        setStatus("failed");
        setError(res.error || "Payment verification failed.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        {status === "verifying" && (
          <div>
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-white">Verifying Payment</h1>
            <p className="text-slate-400 mt-2 text-sm">Please hold on while we secure transaction status from Paystack...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 animate-pulse">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white">Payment Confirmed!</h1>
            <p className="text-emerald-400 text-sm font-semibold mt-1">Transaction Completed Successfully</p>
            <p className="text-slate-400 mt-3 text-sm">Redirecting you to your order status tracking page...</p>
          </div>
        )}

        {status === "failed" && (
          <div>
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
            <p className="text-rose-400 text-sm font-semibold mt-1">Oops! Transaction issue</p>
            <p className="text-slate-400 mt-3 text-sm">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/buy"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition duration-200"
              >
                Try Buying Again
              </Link>
              <Link
                href="/"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition duration-200"
              >
                Go to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse">Loading verification details...</div>
      </div>
    }>
      <CallbackComponent />
    </Suspense>
  );
}
