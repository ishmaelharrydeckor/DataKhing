"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { verifyWalletTopupAction } from "@/app/actions/orders";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";

function WalletCallbackComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || "";
  
  // Custom amount passed down or retrieved
  // In a real environment, the server verifies the actual paid amount from the webhook, 
  // but for the mock checkout verification, we can pass it or read it from session/state.
  // We can pass transaction parameters or metadata. Let's make it verify automatically.
  // In verifyWalletTopupAction, we parse the reference or use a static/metadata-based value.
  // Let's extract amount if it was supplied or default to GH₵50 (5000 pesewas).
  // Actually, we initialized it with metadata, so our mock payment verification has the info.
  // Let's pass 5000 pesewas as a mock default topup if not verified, or let verifyWalletTopupAction extract it.
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [error, setError] = useState<string>("");
  const [creditedAmount, setCreditedAmount] = useState<number>(0);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setError("No transaction reference supplied.");
      return;
    }

    let isMounted = true;

    async function verify() {
      const res = await verifyWalletTopupAction(reference, 5000);
      if (!isMounted) return;

      if (res.success) {
        setStatus("success");
        setCreditedAmount(res.amountPesewas ? res.amountPesewas / 100 : 50);
        setTimeout(() => {
          router.push("/dashboard/wallet");
        }, 2500);
      } else {
        setStatus("failed");
        setError(res.error || "Wallet topup verification failed.");
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
            <h1 className="text-xl font-semibold text-white">Verifying Top-Up</h1>
            <p className="text-slate-400 mt-2 text-sm">Validating transaction status with Paystack...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 animate-pulse">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white">Wallet Credited!</h1>
            <p className="text-emerald-400 text-sm font-semibold mt-1">GH₵{creditedAmount.toFixed(2)} Added Successfully</p>
            <p className="text-slate-400 mt-3 text-sm">Redirecting you to your wallet page...</p>
          </div>
        )}

        {status === "failed" && (
          <div>
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white">Top-Up Failed</h1>
            <p className="text-slate-400 mt-3 text-sm">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/dashboard/wallet"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition duration-200"
              >
                Back to Wallet
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse">Loading wallet update...</div>
      </div>
    }>
      <WalletCallbackComponent />
    </Suspense>
  );
}
