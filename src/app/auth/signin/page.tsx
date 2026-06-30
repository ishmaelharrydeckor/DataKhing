"use client";

import { signIn } from "next-auth/react";
import { useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";

function SignInComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignupSuccess = searchParams.get("signup") === "success";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error || "Invalid credentials.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
        
        <Link href="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-6 font-semibold transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to storefront
        </Link>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
        <p className="text-slate-400 text-sm mt-1">Sign in to access your wallet, reseller tier, and order history.</p>

        {isSignupSuccess && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-2 items-center font-medium">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Account created! Please sign in with your credentials.
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-center font-medium">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 font-semibold rounded-2xl transition duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing you in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-slate-400 text-xs text-center mt-6">
          Don&apos;t have an account yet?{" "}
          <Link href="/auth/signup" className="text-indigo-400 hover:underline font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse">Loading sign in panel...</div>
      </div>
    }>
      <SignInComponent />
    </Suspense>
  );
}
