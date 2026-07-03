"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { applyForAgentAction } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { Award, Briefcase, CheckCircle2, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AgentApplyPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const role = (session?.user as any)?.role;

  useEffect(() => {
    // If the user already is an AGENT or ADMIN, redirect them directly to the portal dashboard
    if (role === "AGENT" || role === "ADMIN") {
      router.push("/agent/dashboard");
    }
  }, [role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await applyForAgentAction(businessName);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to submit application.");
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <Award className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Authentication Required</h1>
          <p className="text-slate-400 text-sm mt-2">Please create an account or sign in to apply for our reseller agent tier.</p>
          <Link href="/auth/signin" className="inline-block mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-semibold text-sm transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
        
        <Link href="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-6 font-semibold transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to storefront
        </Link>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-white">Application Received</h1>
            <p className="text-slate-400 text-sm mt-2">
              Your request is currently being reviewed by our administrators. We will verify your profile and update your tier pricing shortly.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Briefcase className="text-indigo-400 w-6 h-6" />
              Reseller Agent Program
            </h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Earn higher margins by buying in bulk at discounted prices. Resellers get custom pricing tiers on all networks and sell directly to customers.
            </p>

            {error && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-center font-medium">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Business / Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ama Enterprise / Kojo Resells"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-medium"
                />
              </div>

              <div className="text-xs text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-2xl leading-relaxed">
                * Note: Agent tier approval is manual. Make sure your account name and phone details are valid before applying.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 font-semibold rounded-2xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting request...
                  </>
                ) : (
                  "Submit Reseller Application"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
