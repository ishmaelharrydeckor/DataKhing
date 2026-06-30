import { db } from "@/lib/db";
import AdminOrdersClient from "@/components/AdminOrdersClient";

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: {
      bundle: {
        select: {
          label: true,
          network: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <AdminOrdersClient initialOrders={orders as any} />
    </div>
  );
}
