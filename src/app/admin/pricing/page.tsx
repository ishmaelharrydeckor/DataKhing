import { db } from "@/lib/db";
import AdminPricingClient from "@/components/AdminPricingClient";

export const revalidate = 0;

export default async function AdminPricingPage() {
  const bundles = await db.bundle.findMany();

  return (
    <div className="space-y-6">
      <AdminPricingClient initialBundles={bundles} />
    </div>
  );
}
