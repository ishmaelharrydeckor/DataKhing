import { db } from "./db";
import { cookies } from "next/headers";

/**
 * Resolves the currently active store for a user from their session context cookie.
 * Performs strict re-verification to prevent cross-account cookie manipulation.
 */
export async function resolveActiveStore(userId: string) {
  // 1. Fetch all stores owned by this user
  const ownedStores = await db.store.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });

  if (ownedStores.length === 0) {
    return null;
  }

  // 2. Read context cookie
  const cookieStore = await cookies();
  const activeStoreId = cookieStore.get("active_store_id")?.value;

  if (activeStoreId) {
    // Security check: confirm the target store belongs to the active user
    const matched = ownedStores.find((s) => s.id === activeStoreId);
    if (matched) {
      return matched;
    }
  }

  // 3. Fallback: First owned store (Primary store context)
  const defaultStore = ownedStores[0];

  // Self-heal/set cookie context to match fallback
  cookieStore.set("active_store_id", defaultStore.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
  });

  return defaultStore;
}
