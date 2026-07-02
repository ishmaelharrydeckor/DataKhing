"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { submitAgentApplicationAction } from "@/app/actions/store";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function BecomeResellerForm({
  parentStoreId,
  applicationFeePesewas,
  primaryColor,
}: {
  parentStoreId: string;
  applicationFeePesewas: number;
  primaryColor: string;
}) {
  const { data: session } = useSession();
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await submitAgentApplicationAction({
        parentStoreId,
        storeName,
        applicationFeePesewas,
      });

      setLoading(false);
      if (res.success) {
        if (res.checkoutUrl) {
          // Redirect to Paystack payment authorization screen
          window.location.href = res.checkoutUrl;
        } else {
          setSuccess(true);
        }
      } else {
        setError(res.error || "Failed to submit application.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An error occurred.");
    }
  };

  if (!session) {
    return (
      <div className="mt-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6">
        <p className="text-slate-400 text-xs">Please create an account or sign in first to apply for reseller partnership.</p>
        <Link
          href="/auth/signin"
          className="inline-block mt-4 px-6 py-2.5 rounded-xl font-bold text-xs text-white transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-6 mt-6">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-white">Application Submitted!</h2>
        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
          Your request is now pending review. The parent store administrator will verify your store and activate it shortly.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block w-full py-3 bg-slate-900 border border-slate-800 hover:border-slate-750 text-white font-bold rounded-xl text-xs transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Your Store Name
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Joy Data Shop"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white placeholder-slate-800 font-medium"
        />
      </div>

      {applicationFeePesewas > 0 && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-400">
          * Application Fee:{" "}
          <span className="font-bold text-emerald-400">
            GH₵{(applicationFeePesewas / 100).toFixed(2)}
          </span>
          . You will be redirected to Paystack MoMo to complete the fee payment immediately.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 text-white font-bold rounded-2xl text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "Processing request..." : "Submit Application"}
      </button>
    </form>
  );
}
