import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import Link from "next/link";
import { Wallet, History, Users, Settings, User } from "lucide-react";
import { db } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = (session.user as any).id;
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true, referralCode: true, role: true, name: true, email: true },
  });

  if (!dbUser) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Dashboard Profile Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-xl">
              {dbUser.name?.charAt(0).toUpperCase() || dbUser.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{dbUser.name || "Customer Dashboard"}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{dbUser.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                  {dbUser.role}
                </span>
                <span className="text-[10px] font-mono text-indigo-300 font-semibold">
                  Ref: {dbUser.referralCode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-w-[120px]">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Wallet</span>
              <span className="text-lg font-bold text-emerald-400">{formatPesewas(dbUser.walletBalance)}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <History className="w-4 h-4 text-slate-400" />
            Overview
          </Link>
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Wallet className="w-4 h-4 text-slate-400" />
            Wallet & Topups
          </Link>
          <Link
            href="/dashboard/referrals"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Users className="w-4 h-4 text-slate-400" />
            Referrals & Commissions
          </Link>
        </div>

        <div className="bg-slate-950">{children}</div>
      </div>
    </div>
  );
}
