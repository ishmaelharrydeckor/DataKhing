import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ApplicationsList from "./ApplicationsList";
import { resolveActiveStore } from "@/lib/resolve-store";

export const revalidate = 0;

export default async function ApplicationsDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  const currentStore = await resolveActiveStore(userId);

  if (!currentStore) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        You do not currently own a storefront. Please apply to become an agent to configure settings!
      </div>
    );
  }

  // Fetch pending review applications for this parent store
  const applications = await db.agentApplication.findMany({
    where: {
      parentStoreId: currentStore.id,
      status: "PENDING_REVIEW",
    },
    orderBy: { createdAt: "desc" },
  });

  // Map user attributes manually since Prisma relations are configured manually
  const mappedApps = await Promise.all(
    applications.map(async (app) => {
      const user = await db.user.findUnique({
        where: { id: app.applicantUserId },
        select: { name: true, email: true, phone: true },
      });

      return {
        ...app,
        applicantUser: user,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Review Reseller Applicants</h2>
        <p className="text-xs text-slate-400 mt-1">
          Approve sub-agent storefront requests (which copies your baseline pricing and credits fee ledger), or reject requests (which initiates auto-refunds via Paystack).
        </p>
      </div>

      <ApplicationsList applications={mappedApps} />
    </div>
  );
}
