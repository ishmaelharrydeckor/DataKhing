"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

const MAX_STORES_PER_USER = 5;
const STORE_CREATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createIndependentStoreAction(formData: { name: string; displayName: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Authentication required." };
    }
    const userId = (session.user as any).id;

    // 1. Fetch user's existing stores
    const existingStores = await db.store.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
    });

    // 2. Check 5 store limit
    if (existingStores.length >= MAX_STORES_PER_USER) {
      return {
        success: false,
        error: `Limit exceeded. You cannot own more than ${MAX_STORES_PER_USER} stores.`,
      };
    }

    // 3. Check 24-hour cooldown
    if (existingStores.length > 0) {
      const latestStore = existingStores[0];
      const timeElapsed = Date.now() - new Date(latestStore.createdAt).getTime();
      if (timeElapsed < STORE_CREATION_COOLDOWN_MS) {
        const remainingMs = STORE_CREATION_COOLDOWN_MS - timeElapsed;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return {
          success: false,
          error: `Cooldown active. Please wait ${remainingHours} more hour(s) before creating another store.`,
        };
      }
    }

    // 4. Generate unique slug
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanName = formData.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
    const slug = `${cleanName}-${randomSuffix}`;

    // 5. Create new Independent Store
    const newStore = await db.store.create({
      data: {
        ownerUserId: userId,
        parentStoreId: null, // standalone root-like
        slug,
        name: formData.name,
        displayName: formData.displayName,
        storeType: "INDEPENDENT",
        status: "ACTIVE",
        ancestorPath: slug, // Starts its own hierarchy tree path
      },
    });

    // Automatically set the new store as the active store context
    const cookieStore = await cookies();
    cookieStore.set("active_store_id", newStore.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // Accessible client-side if needed
    });

    // Seed default pricing records for the new independent store from the main bundles list
    const activeBundles = await db.bundle.findMany({
      where: { active: true },
    });
    for (const b of activeBundles) {
      await db.storePricing.create({
        data: {
          storeId: newStore.id,
          bundleId: b.id,
          priceForCustomersPesewas: b.sellPricePesewas,
          priceForSubAgentsPesewas: b.agentPricePesewas,
        },
      });
    }

    return { success: true, storeId: newStore.id, slug: newStore.slug };
  } catch (error: any) {
    console.error("createIndependentStoreAction error:", error);
    return { success: false, error: error.message || "Failed to create store." };
  }
}

export async function switchActiveStoreAction(storeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Authentication required." };
    }
    const userId = (session.user as any).id;

    // Verify requesting user actually owns the target store
    const store = await db.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.ownerUserId !== userId) {
      return { success: false, error: "Access denied. You do not own this store." };
    }

    const cookieStore = await cookies();
    cookieStore.set("active_store_id", storeId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
    });

    return { success: true };
  } catch (error: any) {
    console.error("switchActiveStoreAction error:", error);
    return { success: false, error: error.message || "Failed to switch store context." };
  }
}
