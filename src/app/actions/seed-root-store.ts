import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedRootStore() {
  try {
    console.log("Checking for root store...");
    
    // 1. Safeguard: Check if a ROOT store already exists
    const existingRoot = await prisma.store.findFirst({
      where: { storeType: "ROOT" },
    });

    if (existingRoot) {
      console.log(`Root store already exists: [${existingRoot.id}] with slug: [${existingRoot.slug}] — skipping creation.`);
      return { success: true, message: "Root store already exists", storeId: existingRoot.id };
    }

    // 2. Find the default admin user or any user with role ADMIN
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      // Find default admin email or create one if missing
      adminUser = await prisma.user.findFirst({
        where: { email: "admin@datakhing.com" },
      });
    }

    if (!adminUser) {
      console.error("No Admin user found to assign the ROOT store to. Please seed users first.");
      return { success: false, error: "No Admin user found" };
    }

    // 3. Create the Root Store directly (bypassing application)
    const rootStore = await prisma.store.create({
      data: {
        ownerUserId: adminUser.id,
        parentStoreId: null,
        slug: "root",
        name: "DataKhing Root Store",
        status: "ACTIVE",
        storeType: "ROOT",
        displayName: "DataKhing Root",
        ancestorPath: "root",
      },
    });

    console.log(`Successfully seeded ROOT store [${rootStore.id}] for owner user [${adminUser.email}]`);
    return { success: true, storeId: rootStore.id };
  } catch (error: any) {
    console.error("Error seeding root store:", error);
    return { success: false, error: error.message };
  }
}

// Support direct execution via npx tsx
if (require.main === module) {
  seedRootStore()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
