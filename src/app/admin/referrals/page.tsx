import { db } from "@/lib/db";
import AdminAgentAppsClient from "@/components/AdminAgentAppsClient";

export const revalidate = 0;

export default async function AdminReferralsPage() {
  const applications = await db.agentApplication.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <AdminAgentAppsClient initialApps={applications as any} />
    </div>
  );
}
