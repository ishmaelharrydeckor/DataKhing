import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Clock, CheckCircle2, XCircle, AlertCircle, Smartphone } from "lucide-react";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Self-healing: if admin logged in does not own the ROOT store, fix ownership
  if (role === "ADMIN") {
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

  // If user owns an active store (ROOT or AGENT), redirect them to agent portal dashboard immediately
  const store = await db.store.findFirst({
    where: { ownerUserId: userId, status: "ACTIVE" },
  });

  if (store) {
    redirect("/agent/dashboard");
  }

  // Fetch recent orders
  const orders = await db.order.findMany({
    where: { userId },
    include: { bundle: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // Extract unique past recipient phone numbers for quick dialing
  const uniqueRecipients = Array.from(
    new Set(orders.map((o) => o.recipientPhone))
  ).slice(0, 4);

  // Repeat order shortcut: latest order details
  const latestOrder = orders[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Clock className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Repeat Order Shortcut */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:col-span-2 shadow-sm">
          <h3 className="font-bold text-white mb-4">Quick Actions</h3>
          {latestOrder ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Repeat Last Order</span>
                <span className="text-sm font-semibold text-white">
                  {latestOrder.bundle.label} for <span className="text-indigo-400">{latestOrder.recipientPhone}</span>
                </span>
                <p className="text-xs text-slate-400 mt-1">Paid {formatPesewas(latestOrder.amountPaid)}</p>
              </div>
              <Link
                href={`/?phone=${latestOrder.recipientPhone}&bundleId=${latestOrder.bundleId}`}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Buy Again
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
              Place your first order to unlock repeat order shortcuts here!
            </div>
          )}

          {/* Quick Dial past phone numbers */}
          {uniqueRecipients.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Quick Purchase shortcuts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {uniqueRecipients.map((phone) => (
                  <Link
                    key={phone}
                    href={`/?phone=${phone}`}
                    className="flex flex-col items-center p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <Smartphone className="w-5 h-5 text-indigo-400 mb-1" />
                    <span className="text-xs text-white font-mono">{phone}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Support Help Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-white mb-2">Need Support?</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              If a bundle is stuck or you haven&apos;t received your data after a successful checkout, contact our support line or email.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs space-y-1">
            <p className="text-slate-300">Email: <span className="text-white font-semibold">{SITE_CONFIG.SUPPORT_EMAIL}</span></p>
            <p className="text-slate-300">Phone: <span className="text-white font-semibold">{SITE_CONFIG.SUPPORT_PHONE}</span></p>
          </div>
        </div>
      </div>

      {/* Recent Orders log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white">Recent Orders</h3>
          <span className="text-xs text-slate-500">Showing last 8 purchases</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase">
                <th className="pb-3">Recipient</th>
                <th className="pb-3">Data Bundle</th>
                <th className="pb-3">Charged</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {orders.map((o) => (
                <tr key={o.id} className="text-slate-300 hover:text-white transition">
                  <td className="py-3 font-mono text-xs">{o.recipientPhone}</td>
                  <td className="py-3 text-xs">{o.bundle.label}</td>
                  <td className="py-3 text-xs">{formatPesewas(o.amountPaid)}</td>
                  <td className="py-3">{getStatusBadge(o.status)}</td>
                  <td className="py-3 text-xs text-slate-400">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/order/${o.id}`}
                      className="inline-flex items-center gap-0.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Track <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    You have not placed any orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
