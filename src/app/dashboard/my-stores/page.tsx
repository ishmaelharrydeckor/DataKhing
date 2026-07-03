import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AddStoreForm from "@/components/AddStoreForm";
import StoreCardManager from "@/components/StoreCardManager";
import { resolveActiveStore } from "@/lib/resolve-store";
import { Store } from "lucide-react";

export const revalidate = 0;

const MAX_STORES_PER_USER = 5;
const STORE_CREATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default async function MyStoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const userId = (session.user as any).id;

  // 1. Fetch user owned stores
  const ownedStores = await db.store.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });

  const activeStore = await resolveActiveStore(userId);

  // 2. Cooldown calculation
  let cooldownActive = false;
  let cooldownText = "";
  if (ownedStores.length > 0) {
    const latestStore = [...ownedStores].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
    const timeElapsed = Date.now() - latestStore.createdAt.getTime();
    if (timeElapsed < STORE_CREATION_COOLDOWN_MS) {
      cooldownActive = true;
      const remainingMs = STORE_CREATION_COOLDOWN_MS - timeElapsed;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      cooldownText = `Please wait ${remainingHours} more hour(s) before creating another store. You created your last store at ${latestStore.createdAt.toLocaleString()}.`;
    }
  }

  const limitReached = ownedStores.length >= MAX_STORES_PER_USER;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-400" />
          My Stores
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your independent and sub-agent storefront contexts, launch new standalone shops, and audit their status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stores list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Owned Storefronts ({ownedStores.length} / {MAX_STORES_PER_USER})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownedStores.map((s) => (
              <StoreCardManager
                key={s.id}
                store={{
                  id: s.id,
                  name: s.name,
                  slug: s.slug,
                  status: s.status,
                  storeType: s.storeType,
                  createdAt: s.createdAt,
                }}
                isActive={activeStore?.id === s.id}
              />
            ))}
            {ownedStores.length === 0 && (
              <div className="md:col-span-2 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                You do not own any stores yet. Create your first independent store on the right!
              </div>
            )}
          </div>
        </div>

        {/* Creator panel */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Launch New Store
          </h3>
          <AddStoreForm
            cooldownActive={cooldownActive}
            cooldownText={cooldownText}
            limitReached={limitReached}
          />
        </div>
      </div>
    </div>
  );
}
