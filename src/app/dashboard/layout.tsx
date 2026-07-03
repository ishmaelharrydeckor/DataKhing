import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import Link from "next/link";
import { Wallet, History, Users, Settings, User, Sliders, Palette, Landmark, FileCheck, LayoutGrid } from "lucide-react";
import { db } from "@/lib/db";
import { resolveActiveStore } from "@/lib/resolve-store";
import StoreSwitcher from "@/components/StoreSwitcher";

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

  // Self-healing: if admin logged in does not own the ROOT store, fix ownership
  if (dbUser.role === "ADMIN") {
    const rootStore = await db.store.findFirst({
      where: { storeType: "ROOT" },
    });
    if (rootStore && rootStore.ownerUserId !== userId) {
      await db.store.update({
        where: { id: rootStore.id },
        data: { ownerUserId: userId },
      });
    }
  }

  // Fetch active store context and all owned stores for switcher
  const activeStore = await resolveActiveStore(userId);
  const ownedStores = await db.store.findMany({
    where: { ownerUserId: userId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  const isResellerOrAdmin = dbUser.role === "AGENT" || dbUser.role === "ADMIN";

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

          <div className="flex gap-4 items-center">
            {activeStore && (
              <StoreSwitcher stores={ownedStores} activeStoreId={activeStore.id} />
            )}
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
            Referrals
          </Link>
          <Link
            href="/dashboard/my-stores"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <LayoutGrid className="w-4 h-4 text-slate-400" />
            My Stores
          </Link>

          {isResellerOrAdmin && (
            <>
              <Link
                href="/dashboard/pricing"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
                Custom Pricing
              </Link>
              <Link
                href="/dashboard/branding"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <Palette className="w-4 h-4 text-indigo-400" />
                Branding Config
              </Link>
              <Link
                href="/dashboard/agents"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                My Agents
              </Link>
              <Link
                href="/dashboard/sub-agents"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                Sub-Agents
              </Link>
              <Link
                href="/dashboard/applications"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Review Applicants
              </Link>
              <Link
                href="/dashboard/withdrawals"
                className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-indigo-400 active:bg-slate-850"
              >
                <Landmark className="w-4 h-4 text-indigo-400" />
                Ledger Profits
              </Link>
            </>
          )}
        </div>

        <div className="bg-slate-950">{children}</div>
      </div>
    </div>
  );
}
