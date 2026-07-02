import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BrandingForm from "./BrandingForm";

export const revalidate = 0;

export default async function BrandingDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  // Find store owned by this user
  const store = await db.store.findFirst({
    where: { ownerUserId: userId },
  });

  if (!store) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        You do not currently own a storefront. Please apply to become an agent to get your dynamic storefront path!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">White-Label Branding Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Configure logos, custom theme primary color, and footer copyright text dynamically.</p>
      </div>

      <BrandingForm store={store} />
    </div>
  );
}
