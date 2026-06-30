"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpAction } from "@/app/actions/auth";
import Link from "next/link";
import { User, Mail, Phone, Lock, Award, ShieldAlert, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signUpAction({
      name,
      email,
      phone,
      password,
      referralCode: referralCode || undefined,
    });

    setLoading(false);

    if (res.success) {
      router.push("/auth/signin?signup=success");
    } else {
      setError(res.error || "Signup failed");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
        
        <Link href="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-6 font-semibold transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h1>
        <p className="text-slate-400 text-sm mt-1">Unlock wallet balance topups and up to 5% cashback on referrals</p>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-center font-medium">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                required
                placeholder="0241234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Referral Code (Optional)</label>
            <div className="relative">
              <Award className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="e.g. AGENTREF"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm transition text-white placeholder-slate-700 font-mono"
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
                Registering account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="text-slate-400 text-xs text-center mt-6">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-indigo-400 hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
