import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ShoppingBag, Users, HelpCircle, LayoutDashboard, Award, Coins } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/");
  }

  const userId = (session.user as any).id;
  const rootStore = await db.store.findFirst({
    where: { ownerUserId: userId, storeType: "ROOT" },
  });

  if (!rootStore) {
    redirect("/");
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Profile Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex items-center justify-between relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mb-2">
              System Control Panel
            </span>
            <h1 className="text-2xl font-bold text-white">Administrator Console</h1>
            <p className="text-xs text-slate-400 mt-1">Configure pricing markups, audit orders, adjust balances, and approve agent applications.</p>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            Overview
          </Link>
          <Link
            href="/admin/pricing"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Pricing Manager
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <ShoppingBag className="w-4 h-4 text-slate-400" />
            Orders Log
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Users className="w-4 h-4 text-slate-400" />
            User Wallets
          </Link>
          <Link
            href="/admin/referrals"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Award className="w-4 h-4 text-slate-400" />
            Agent Applications
          </Link>
          <Link
            href="/admin/commissions"
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition text-slate-300 active:bg-slate-850"
          >
            <Coins className="w-4 h-4 text-slate-400" />
            Commissions
          </Link>
        </div>

        <div className="bg-slate-950">{children}</div>
      </div>
    </div>
  );
}
