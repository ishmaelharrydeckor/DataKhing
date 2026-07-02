import { db } from "@/lib/db";
import AdminAgentAppsClient from "@/components/AdminAgentAppsClient";

export const revalidate = 0;

export default async function AdminReferralsPage() {
  const applications = await db.agentApplication.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map to fit legacy client view parameters
  const mappedApps = await Promise.all(
    applications.map(async (app) => {
      const user = await db.user.findUnique({
        where: { id: app.applicantUserId },
        select: { name: true, email: true, phone: true },
      });

      return {
        id: app.id,
        userId: app.applicantUserId,
        status: app.status,
        businessName: app.storeName,
        createdAt: app.createdAt,
        user: {
          name: user?.name || "Anonymous",
          email: user?.email || "unknown@datakhing.com",
          phone: user?.phone || "",
        },
      };
    })
  );

  return (
    <div className="space-y-6">
      <AdminAgentAppsClient initialApps={mappedApps as any} />
    </div>
  );
}
