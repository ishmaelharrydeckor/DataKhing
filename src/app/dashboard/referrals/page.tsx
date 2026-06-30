import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPesewas, SITE_CONFIG } from "@/lib/site-config";
import { Copy, Gift, Award, Users, CheckCircle2, AlertCircle } from "lucide-react";
import ReferralsCopyBtn from "@/components/ReferralsCopyBtn";

export const revalidate = 0;

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  const referralCode = user?.referralCode || "";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const referralLink = `${baseUrl}/?ref=${referralCode}`;

  // Get stats
  const referredCount = await db.user.count({
    where: { referredById: userId },
  });

  const rewardsSumObj = await db.walletTransaction.aggregate({
    _sum: {
      amountPesewas: true,
    },
    where: {
      userId,
      type: "REFERRAL_CREDIT",
    },
  });
  const totalRewardsEarned = rewardsSumObj._sum.amountPesewas ?? 0;

  const referrals = await db.referral.findMany({
    where: { referrerId: userId },
    include: { referredUser: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Referral Link banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="max-w-2xl">
          <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-indigo-400" />
            Invite Friends & Earn Cashback!
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            Share your unique referral link. When your friends register and purchase any mobile data bundle on {SITE_CONFIG.SITE_NAME}, you instantly earn <span className="text-white font-bold">5% cashback</span> on their total order value credited to your wallet balance.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3 text-xs sm:text-sm font-mono text-indigo-300 truncate select-all flex items-center">
              {referralLink}
            </div>
            <ReferralsCopyBtn text={referralLink} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Referred Users</span>
            <span className="text-2xl font-bold text-white">{referredCount} Signups</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Cashback Earned</span>
            <span className="text-2xl font-bold text-emerald-400">{formatPesewas(totalRewardsEarned)}</span>
          </div>
        </div>
      </div>

      {/* Referral details table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-white mb-6">Referred Friends List</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Date Joined</th>
                <th className="pb-3">Reward Type</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {referrals.map((r) => (
                <tr key={r.id} className="text-slate-300 hover:text-white transition">
                  <td className="py-3 text-xs">{r.referredUser.name || "Anon"}</td>
                  <td className="py-3 text-xs text-slate-400">{r.referredUser.email}</td>
                  <td className="py-3 text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-xs font-semibold text-indigo-400">
                    {r.rewardType} (5%)
                  </td>
                  <td className="py-3 text-right">
                    {r.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Active Earner
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" /> Pending Purchase
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                    You have not referred anyone yet. Share your link above to get started!
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
