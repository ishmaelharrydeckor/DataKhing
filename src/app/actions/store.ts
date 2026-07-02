"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPaymentClient } from "@/lib/payment";

/**
 * Submits an application to become a reseller under a specific parent store.
 */
export async function submitAgentApplicationAction(formData: {
  parentStoreId: string;
  storeName: string;
  applicationFeePesewas: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Authentication required." };
    }
    const applicantUserId = (session.user as any).id;

    // Check if user already has an active store or pending application
    const existingStore = await db.store.findFirst({
      where: { ownerUserId: applicantUserId, status: "ACTIVE" },
    });
    if (existingStore) {
      return { success: false, error: "You already own an active store." };
    }

    const parentStore = await db.store.findUnique({
      where: { id: formData.parentStoreId },
    });
    if (!parentStore) {
      return { success: false, error: "Parent store not found." };
    }

    // Set callback URL for paystack checkout completion
    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shop/${parentStore.slug}/become-a-reseller/callback`;

    // Initialize Paystack payment for application fee if greater than 0
    let paymentRef: string | null = null;
    let checkoutUrl: string | null = null;

    if (formData.applicationFeePesewas > 0) {
      const paymentClient = getPaymentClient();
      const metadata = {
        type: "AGENT_APPLICATION_FEE",
        applicantUserId,
        parentStoreId: formData.parentStoreId,
        storeName: formData.storeName,
        applicationFeePesewas: formData.applicationFeePesewas,
      };

      const payResult = await paymentClient.initializeTransaction(
        session.user.email!,
        formData.applicationFeePesewas,
        callbackUrl,
        metadata
      );
      paymentRef = payResult.reference;
      checkoutUrl = payResult.authorizationUrl;
    }

    const application = await db.agentApplication.create({
      data: {
        applicantUserId,
        parentStoreId: formData.parentStoreId,
        storeName: formData.storeName,
        applicationFeePesewas: formData.applicationFeePesewas,
        paymentRef,
        status: formData.applicationFeePesewas > 0 ? "PENDING_PAYMENT" : "PENDING_REVIEW",
      },
    });

    return {
      success: true,
      applicationId: application.id,
      checkoutUrl,
    };
  } catch (error: any) {
    console.error("submitAgentApplicationAction error:", error);
    return { success: false, error: error.message || "Failed to submit application." };
  }
}

/**
 * Approves a reseller application (Parent store dashboard).
 */
export async function approveAgentApplicationAction(applicationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const adminUserId = (session.user as any).id;

    const app = await db.agentApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app || app.status !== "PENDING_REVIEW") {
      throw new Error("Application not found or not ready for review.");
    }

    // Verify current user owns the parent store
    const parentStore = await db.store.findUnique({
      where: { id: app.parentStoreId },
    });

    if (!parentStore || (parentStore.ownerUserId !== adminUserId && (session.user as any).role !== "ADMIN")) {
      throw new Error("You do not have permission to approve applications for this store.");
    }

    // Create unique slug for new store
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanName = app.storeName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
    const slug = `${cleanName}-${randomSuffix}`;

    const newStore = await db.$transaction(async (tx) => {
      // 1. Create the new Store row
      const store = await tx.store.create({
        data: {
          ownerUserId: app.applicantUserId,
          parentStoreId: app.parentStoreId,
          slug,
          name: app.storeName,
          status: "ACTIVE",
          storeType: "AGENT",
          displayName: app.storeName,
          ancestorPath: `${parentStore.ancestorPath}/${slug}`,
        },
      });

      // Update User role to AGENT
      await tx.user.update({
        where: { id: app.applicantUserId },
        data: { role: "AGENT" },
      });

      // 2. Copy parent store pricing to the new store as baseline starting pricing
      const parentPricings = await tx.storePricing.findMany({
        where: { storeId: app.parentStoreId },
      });

      if (parentPricings.length > 0) {
        await tx.storePricing.createMany({
          data: parentPricings.map((p) => ({
            storeId: store.id,
            bundleId: p.bundleId,
            priceForCustomersPesewas: p.priceForSubAgentsPesewas, // Use parent's agent cost as client's base customer price
            priceForSubAgentsPesewas: p.priceForSubAgentsPesewas, // Baseline default sub-agent price
          })),
        });
      }

      // 3. Credit parent store with the application fee in Ledger
      if (app.applicationFeePesewas > 0) {
        await tx.ledger.create({
          data: {
            storeId: app.parentStoreId,
            applicationId: app.id,
            tierDepth: 0,
            buyPricePesewas: 0,
            sellPricePesewas: app.applicationFeePesewas,
            amountPesewas: app.applicationFeePesewas,
            status: "AVAILABLE",
          },
        });
      }

      // 4. Update Application status
      await tx.agentApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
        },
      });

      return store;
    });

    revalidatePath("/dashboard/applications");
    return { success: true, storeId: newStore.id, slug: newStore.slug };
  } catch (error: any) {
    console.error("approveAgentApplicationAction error:", error);
    return { success: false, error: error.message || "Failed to approve application." };
  }
}

/**
 * Rejects reseller application and triggers automatic fee refund.
 */
export async function rejectAgentApplicationAction(applicationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const adminUserId = (session.user as any).id;

    const app = await db.agentApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app || app.status !== "PENDING_REVIEW") {
      throw new Error("Application not found or not ready for review.");
    }

    const parentStore = await db.store.findUnique({
      where: { id: app.parentStoreId },
    });

    if (!parentStore || (parentStore.ownerUserId !== adminUserId && (session.user as any).role !== "ADMIN")) {
      throw new Error("You do not have permission to reject applications for this store.");
    }

    // Process refund via payment client if there was an application fee and reference
    if (app.applicationFeePesewas > 0 && app.paymentRef) {
      const paymentClient = getPaymentClient();
      const refundSuccess = await paymentClient.refundTransaction(app.paymentRef);
      if (!refundSuccess) {
        throw new Error("Failed to process fee refund via Paystack.");
      }
    }

    await db.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/applications");
    return { success: true };
  } catch (error: any) {
    console.error("rejectAgentApplicationAction error:", error);
    return { success: false, error: error.message || "Failed to reject application." };
  }
}

/**
 * Suspends or reactivates a direct child store.
 */
export async function toggleStoreSuspensionAction(storeId: string, suspend: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const ownerUserId = (session.user as any).id;

    const store = await db.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Store not found.");
    }

    // Verify parent permissions
    if (store.parentStoreId) {
      const parentStore = await db.store.findUnique({
        where: { id: store.parentStoreId },
      });
      if (!parentStore || (parentStore.ownerUserId !== ownerUserId && (session.user as any).role !== "ADMIN")) {
        throw new Error("Permission denied. Only approving parent stores can suspend child stores.");
      }
    } else if ((session.user as any).role !== "ADMIN") {
      throw new Error("Permission denied. Only administrators can suspend root stores.");
    }

    await db.store.update({
      where: { id: storeId },
      data: {
        status: suspend ? "SUSPENDED" : "ACTIVE",
      },
    });

    revalidatePath("/dashboard/agents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves customized subagent and client prices for bundles.
 */
export async function updateStorePricingAction(
  storeId: string,
  pricingGrid: Array<{
    bundleId: string;
    priceForCustomersPesewas: number;
    priceForSubAgentsPesewas: number;
  }>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const userId = (session.user as any).id;

    const store = await db.store.findUnique({
      where: { id: storeId },
    });

    if (!store || (store.ownerUserId !== userId && (session.user as any).role !== "ADMIN")) {
      throw new Error("Permission denied.");
    }

    // Enforce pricing floors
    for (const item of pricingGrid) {
      let costFloorPesewas = 0;

      if (store.parentStoreId) {
        // Parent store charges this store:
        const parentPricing = await db.storePricing.findUnique({
          where: {
            storeId_bundleId: {
              storeId: store.parentStoreId,
              bundleId: item.bundleId,
            },
          },
        });
        if (parentPricing) {
          costFloorPesewas = parentPricing.priceForSubAgentsPesewas;
        } else {
          // Default backup cost
          const bundle = await db.bundle.findUnique({ where: { id: item.bundleId } });
          costFloorPesewas = bundle?.supplierCostPesewas ?? 0;
        }
      } else {
        // Root store pays DataMart wholesale cost
        const bundle = await db.bundle.findUnique({ where: { id: item.bundleId } });
        costFloorPesewas = bundle?.supplierCostPesewas ?? 0;
      }

      if (item.priceForCustomersPesewas < costFloorPesewas) {
        throw new Error(
          `Customer price must be greater than or equal to buy-in cost (GH₵${(costFloorPesewas / 100).toFixed(2)}).`
        );
      }
      if (item.priceForSubAgentsPesewas < costFloorPesewas) {
        throw new Error(
          `Sub-agent price must be greater than or equal to buy-in cost (GH₵${(costFloorPesewas / 100).toFixed(2)}).`
        );
      }
    }

    // Upsert pricing objects
    await db.$transaction(async (tx) => {
      for (const item of pricingGrid) {
        await tx.storePricing.upsert({
          where: {
            storeId_bundleId: {
              storeId,
              bundleId: item.bundleId,
            },
          },
          create: {
            storeId,
            bundleId: item.bundleId,
            priceForCustomersPesewas: item.priceForCustomersPesewas,
            priceForSubAgentsPesewas: item.priceForSubAgentsPesewas,
          },
          update: {
            priceForCustomersPesewas: item.priceForCustomersPesewas,
            priceForSubAgentsPesewas: item.priceForSubAgentsPesewas,
          },
        });
      }
    });

    revalidatePath("/dashboard/pricing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates dynamic branding attributes.
 */
export async function updateStoreBrandingAction(
  storeId: string,
  branding: {
    displayName: string;
    logoUrl?: string;
    primaryColor?: string;
    supportEmail?: string;
    contactPhone?: string;
    footerText?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const userId = (session.user as any).id;

    const store = await db.store.findUnique({
      where: { id: storeId },
    });

    if (!store || (store.ownerUserId !== userId && (session.user as any).role !== "ADMIN")) {
      throw new Error("Permission denied.");
    }

    await db.store.update({
      where: { id: storeId },
      data: branding,
    });

    revalidatePath(`/shop/${store.slug}`);
    revalidatePath("/dashboard/branding");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
