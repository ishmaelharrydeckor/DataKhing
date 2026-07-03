import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PricingGrid from "./PricingGrid";
import { resolveActiveStore } from "@/lib/resolve-store";

export const revalidate = 0;

export default async function PricingDashboardPage() {
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

  // Fetch bundles and current pricing for this store
  const bundles = await db.bundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataAmountGB: "asc" }],
  });

  const pricings = await db.storePricing.findMany({
    where: { storeId: currentStore.id },
  });

  // Calculate purchase cost per bundle (cost floor)
  const bundleCosts = await Promise.all(
    bundles.map(async (bundle) => {
      let buyPricePesewas = bundle.supplierCostPesewas;

      if (currentStore.parentStoreId) {
        const parentPricing = await db.storePricing.findUnique({
          where: {
            storeId_bundleId: {
              storeId: currentStore.parentStoreId,
              bundleId: bundle.id,
            },
          },
        });
        if (parentPricing) {
          buyPricePesewas = parentPricing.priceForSubAgentsPesewas;
        }
      }

      return {
        bundleId: bundle.id,
        costFloor: buyPricePesewas,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Data Bundle Pricing Sheet</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Set customized prices for customers and sub-agents. Pricings must satisfy the buy-in cost floor validation limit.
        </p>
      </div>

      <PricingGrid store={currentStore} bundles={bundles} pricings={pricings} costs={bundleCosts} />
    </div>
  );
}
