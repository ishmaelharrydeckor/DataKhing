import { db } from "@/lib/db";
import AdminUsersClient from "@/components/AdminUsersClient";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <AdminUsersClient initialUsers={users as any} />
    </div>
  );
}
