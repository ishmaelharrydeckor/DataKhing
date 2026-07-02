"use server";

import { db } from "@/lib/db";
import { getSupplierClient } from "@/lib/supplier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized access. Admin privileges required.");
  }
  return (session.user as any).id;
}

export async function adjustUserWalletAction(userId: string, amountPesewas: number, reason: string) {
  try {
    const adminId = await verifyAdmin();

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found." };

    const updatedUser = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amountPesewas } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: "TOPUP", // treated as admin topup
          amountPesewas,
          balanceAfter: u.walletBalance,
          notes: `ADMIN-ADJUST: ${reason || "No reason provided"}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "ADJUST_WALLET",
          details: JSON.stringify({
            targetUserId: userId,
            amount: amountPesewas,
            reason,
            previousBalance: user.walletBalance,
            newBalance: u.walletBalance,
          }),
        },
      });

      return u;
    });

    revalidatePath("/admin/users");
    return { success: true, newBalance: updatedUser.walletBalance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBundlePricesAction(
  bundleId: string,
  sellPricePesewas: number,
  agentPricePesewas: number
) {
  try {
    const adminId = await verifyAdmin();

    const bundle = await db.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) return { success: false, error: "Bundle not found." };

    const updated = await db.bundle.update({
      where: { id: bundleId },
      data: {
        sellPricePesewas,
        agentPricePesewas,
      },
    });

    // Record audit log
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE_PRICE",
        details: JSON.stringify({
          bundleId,
          network: bundle.network,
          label: bundle.label,
          oldSell: bundle.sellPricePesewas,
          newSell: sellPricePesewas,
          oldAgent: bundle.agentPricePesewas,
          newAgent: agentPricePesewas,
        }),
      },
    });

    revalidatePath("/admin/pricing");
    return { success: true, bundle: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOrderManualStatusAction(orderId: string, status: string) {
  try {
    const adminId = await verifyAdmin();

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found." };

    const updated = await db.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "OVERRIDE_ORDER",
        details: JSON.stringify({
          orderId,
          oldStatus: order.status,
          newStatus: status,
        }),
      },
    });

    revalidatePath("/admin/orders");
    return { success: true, status: updated.status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function retrySupplierOrderAction(orderId: string) {
  try {
    const adminId = await verifyAdmin();

    const order = await db.order.findUnique({ where: { id: orderId }, include: { bundle: true } });
    if (!order) return { success: false, error: "Order not found." };

    const supplierClient = getSupplierClient();
    const placementResult = await supplierClient.placeOrder(
      order.bundleId,
      order.recipientPhone,
      order.id
    );

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        supplierOrderRef: placementResult.supplierOrderRef,
        status: placementResult.status === "PENDING" ? "PROCESSING" : placementResult.status,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "RETRY_ORDER_SUPPLIER",
        details: JSON.stringify({
          orderId,
          supplierOrderRef: placementResult.supplierOrderRef,
          status: placementResult.status,
        }),
      },
    });

    revalidatePath("/admin/orders");
    return { success: true, order: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function manageAgentApplicationAction(applicationId: string, status: "APPROVED" | "REJECTED") {
  try {
    const adminId = await verifyAdmin();

    const app = await db.agentApplication.findUnique({ where: { id: applicationId } });
    if (!app) return { success: false, error: "Application not found." };

    await db.$transaction(async (tx) => {
      // Update application
      await tx.agentApplication.update({
        where: { id: applicationId },
        data: { status },
      });

      // If approved, update user's role to AGENT
      if (status === "APPROVED") {
        await tx.user.update({
          where: { id: app.applicantUserId },
          data: { role: "AGENT" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `AGENT_APPLICATION_${status}`,
          details: JSON.stringify({
            applicationId,
            targetUserId: app.applicantUserId,
            businessName: app.storeName,
          }),
        },
      });
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/referrals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSupplierCatalogDiffAction() {
  try {
    await verifyAdmin();
    const supplierClient = getSupplierClient();
    const supplierBundles = await supplierClient.getCatalog();
    const localBundles = await db.bundle.findMany();

    const newItems: any[] = [];
    const updatedItems: any[] = [];
    const removedItems: any[] = [];

    // Map by some logic (e.g. combination of network & label, or supplier cost changes)
    for (const sb of supplierBundles) {
      // Find if we have it locally by matching network and label
      const matched = localBundles.find(
        (lb) => lb.network === sb.network && lb.label === sb.label
      );

      if (!matched) {
        newItems.push({
          network: sb.network,
          label: sb.label,
          dataAmountGB: sb.dataAmountGB,
          supplierCostPesewas: sb.supplierCostPesewas,
        });
      } else if (matched.supplierCostPesewas !== sb.supplierCostPesewas) {
        updatedItems.push({
          id: matched.id,
          network: sb.network,
          label: sb.label,
          oldCost: matched.supplierCostPesewas,
          newCost: sb.supplierCostPesewas,
        });
      }
    }

    for (const lb of localBundles) {
      const matched = supplierBundles.find(
        (sb) => sb.network === lb.network && sb.label === lb.label
      );
      if (!matched) {
        removedItems.push(lb);
      }
    }

    return {
      success: true,
      diff: { newItems, updatedItems, removedItems },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function applyCatalogSyncAction(diff: {
  newItems: any[];
  updatedItems: any[];
  removedItems: any[];
}) {
  try {
    const adminId = await verifyAdmin();

    await db.$transaction(async (tx) => {
      // Add new items
      for (const item of diff.newItems) {
        // Add markup: default 30% for retail, 15% for agent
        const sellPrice = Math.floor(item.supplierCostPesewas * 1.3);
        const agentPrice = Math.floor(item.supplierCostPesewas * 1.15);

        await tx.bundle.create({
          data: {
            network: item.network,
            label: item.label,
            dataAmountGB: item.dataAmountGB,
            supplierCostPesewas: item.supplierCostPesewas,
            sellPricePesewas: sellPrice,
            agentPricePesewas: agentPrice,
            active: true,
          },
        });
      }

      // Update costs
      for (const item of diff.updatedItems) {
        // Automatically adjust selling prices proportionally
        const bundle = await tx.bundle.findUnique({ where: { id: item.id } });
        if (bundle) {
          const ratio = item.newCost / item.oldCost;
          const newSell = Math.floor(bundle.sellPricePesewas * ratio);
          const newAgent = Math.floor(bundle.agentPricePesewas * ratio);

          await tx.bundle.update({
            where: { id: item.id },
            data: {
              supplierCostPesewas: item.newCost,
              sellPricePesewas: newSell,
              agentPricePesewas: newAgent,
            },
          });
        }
      }

      // Deactivate/delete items
      for (const item of diff.removedItems) {
        await tx.bundle.update({
          where: { id: item.id },
          data: { active: false }, // we soft-delete bundles to preserve order references
        });
      }

      // Record audit
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "SYNC_CATALOG",
          details: JSON.stringify(diff),
        },
      });
    });

    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
