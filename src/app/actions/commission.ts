"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const PAYOUT_THRESHOLD_PESEWAS = 2000; // GH₵20.00 minimum threshold

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized. Admin permissions required.");
  }
  return (session.user as any).id;
}

/**
 * Automates creating a commission record when an order is completed.
 * It is called inside order verification, polling, and webhook handlers.
 */
export async function checkAndCreateCommission(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: true, bundle: true },
    });

    if (!order || order.status !== "DELIVERED") return;

    // Check if commission already logged
    const existing = await db.commission.findFirst({
      where: { orderId },
    });
    if (existing) return;

    let agentUserId: string | null = null;

    // Trace agent: Is buyer an agent, or referred by an agent?
    if (order.user?.role === "AGENT") {
      agentUserId = order.userId;
    } else if (order.user?.referredById) {
      const referrer = await db.user.findUnique({
        where: { id: order.user.referredById },
      });
      if (referrer && referrer.role === "AGENT") {
        agentUserId = referrer.id;
      }
    }

    if (!agentUserId) return;

    // Calculate commission rate and amount based on carrier markup difference
    const diff = order.bundle.sellPricePesewas - order.bundle.agentPricePesewas;
    const commissionRatePercent = order.bundle.sellPricePesewas > 0
      ? Math.max(1, Math.round((diff / order.bundle.sellPricePesewas) * 100))
      : 10; // Default to 10% fallback
    
    const commissionAmountPesewas = Math.floor((order.amountPaid * commissionRatePercent) / 100);

    await db.commission.create({
      data: {
        agentUserId,
        orderId: order.id,
        salePricePesewas: order.amountPaid,
        commissionRatePercent,
        commissionAmountPesewas,
        status: "PENDING",
      },
    });

    console.log(`Commission created: Agent ${agentUserId} earned ${commissionAmountPesewas} pesewas for order ${order.id}`);
  } catch (error) {
    console.error("checkAndCreateCommission error:", error);
  }
}

/**
 * Reverses a commission when an order is failed or refunded.
 */
export async function checkAndReverseCommission(orderId: string) {
  try {
    const commission = await db.commission.findFirst({
      where: { orderId },
    });

    if (commission && commission.status !== "REVERSED" && commission.status !== "PAID") {
      await db.commission.update({
        where: { id: commission.id },
        data: { status: "REVERSED" },
      });
      console.log(`Commission reversed for order ${orderId}`);
    }
  } catch (error) {
    console.error("checkAndReverseCommission error:", error);
  }
}

/**
 * Admin action: Bulk approves PENDING commissions.
 */
export async function approveCommissionsAction(commissionIds: string[]) {
  try {
    const adminId = await verifyAdmin();

    await db.$transaction(async (tx) => {
      await tx.commission.updateMany({
        where: {
          id: { in: commissionIds },
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
        },
      });

      // Log audits
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "COMMISSION_APPROVE",
          details: JSON.stringify({ commissionIds }),
        },
      });
    });

    revalidatePath("/admin/commissions");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Agent action: Requests payout for APPROVED commissions.
 */
export async function requestPayoutAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const userId = (session.user as any).id;

    // Get all approved commissions
    const approvedCommissions = await db.commission.findMany({
      where: {
        agentUserId: userId,
        status: "APPROVED",
        payoutBatchId: null,
      },
    });

    const totalAmount = approvedCommissions.reduce((sum, c) => sum + c.commissionAmountPesewas, 0);

    if (totalAmount < PAYOUT_THRESHOLD_PESEWAS) {
      throw new Error(`Minimum payout threshold is ${formatPesewas(PAYOUT_THRESHOLD_PESEWAS)}`);
    }

    const batch = await db.$transaction(async (tx) => {
      // Create batch
      const b = await tx.agentPayoutBatch.create({
        data: {
          agentUserId: userId,
          totalAmountPesewas: totalAmount,
          status: "PENDING",
        },
      });

      // Link commissions to this batch
      await tx.commission.updateMany({
        where: {
          id: { in: approvedCommissions.map((c) => c.id) },
        },
        data: {
          payoutBatchId: b.id,
        },
      });

      return b;
    });

    revalidatePath("/agent/dashboard");
    return { success: true, batchId: batch.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Admin action: Marks a pending batch payout as paid.
 * Attests manual Mom/Bank reference IDs.
 */
export async function payoutAgentBatchAction(
  batchId: string,
  payoutMethod: "manual_momo" | "manual_bank",
  payoutReference: string,
  notes?: string
) {
  try {
    const adminId = await verifyAdmin();

    if (!payoutReference.trim()) {
      throw new Error("Payout transaction reference ID is required.");
    }

    // Call automation payout service
    await payoutAgent(batchId, payoutMethod, payoutReference, adminId, notes);

    revalidatePath("/admin/commissions");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Internal service method for batch payouts.
 * Designed to easily support automated Paystack Transfers later.
 */
async function payoutAgent(
  batchId: string,
  method: string,
  reference: string,
  adminId: string,
  notes?: string
) {
  const batch = await db.agentPayoutBatch.findUnique({
    where: { id: batchId },
    include: { commissions: true },
  });

  if (!batch || batch.status !== "PENDING") {
    throw new Error("Payout batch not found or already completed.");
  }

  // --- EXTENSION POINT FOR PAYSTACK TRANSFERS ---
  // If (method === "paystack_transfer"), initialize Paystack Transfer API call here
  // and wait/verify transaction reference.
  // -----------------------------------------------

  await db.$transaction(async (tx) => {
    // 1. Mark batch as completed
    await tx.agentPayoutBatch.update({
      where: { id: batchId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        createdByAdminId: adminId,
      },
    });

    // 2. Set all associated commissions to paid
    await tx.commission.updateMany({
      where: {
        payoutBatchId: batchId,
      },
      data: {
        status: "PAID",
        payoutMethod: method,
        payoutReference: reference,
        paidAt: new Date(),
        paidByAdminId: adminId,
        notes,
      },
    });

    // 3. Log admin audit trail
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PAYOUT_BATCH_COMPLETE",
        details: JSON.stringify({
          batchId,
          totalAmount: batch.totalAmountPesewas,
          method,
          reference,
          notes,
        }),
      },
    });
  });
}

function formatPesewas(pesewas: number): string {
  return `GH₵${(pesewas / 100).toFixed(2)}`;
}
