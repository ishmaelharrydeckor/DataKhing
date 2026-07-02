"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPaymentClient } from "@/lib/payment";

const PAYOUT_THRESHOLD_PESEWAS = 2000; // GH₵20.00 minimum threshold

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized. Admin permissions required.");
  }
  return (session.user as any).id;
}

/**
 * Request a withdrawal against AVAILABLE ledger rows.
 */
export async function requestWithdrawalAction(storeId: string, amountPesewas: number, payoutMethod: "MANUAL_MOMO" | "MANUAL_BANK" | "PAYSTACK_TRANSFER") {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const userId = (session.user as any).id;

    // Verify user owns the store
    const store = await db.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.ownerUserId !== userId) {
      throw new Error("You do not own this store.");
    }

    // Get available ledger entries
    const availableLedgers = await db.ledger.findMany({
      where: {
        storeId,
        status: "AVAILABLE",
      },
    });

    const currentBalance = availableLedgers.reduce((sum, l) => sum + l.amountPesewas, 0);
    if (currentBalance < amountPesewas) {
      throw new Error("Insufficient available balance.");
    }

    if (amountPesewas < PAYOUT_THRESHOLD_PESEWAS) {
      throw new Error(`Minimum payout threshold is GH₵${(PAYOUT_THRESHOLD_PESEWAS / 100).toFixed(2)}`);
    }

    // Select ledger IDs to cover the requested amount
    let accrued = 0;
    const ledgerIdsToWithdraw: string[] = [];
    for (const ledger of availableLedgers) {
      accrued += ledger.amountPesewas;
      ledgerIdsToWithdraw.push(ledger.id);
      if (accrued >= amountPesewas) {
        break;
      }
    }

    const withdrawal = await db.$transaction(async (tx) => {
      // Create withdrawal record
      const w = await tx.withdrawal.create({
        data: {
          storeId,
          amountPesewas,
          ledgerIds: ledgerIdsToWithdraw,
          status: "PENDING",
          payoutMethod,
        },
      });

      // Move covered ledger entries to WITHDRAWN status immediately
      await tx.ledger.updateMany({
        where: {
          id: { in: ledgerIdsToWithdraw },
        },
        data: {
          status: "WITHDRAWN",
        },
      });

      return w;
    });

    revalidatePath("/agent/dashboard");
    revalidatePath("/dashboard/withdrawals");
    return { success: true, withdrawalId: withdrawal.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Approves a pending withdrawal and processes pay out.
 */
export async function payoutWithdrawalAction(
  withdrawalId: string,
  payoutReference: string,
  notes?: string
) {
  try {
    const adminId = await verifyAdmin();

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.status !== "PENDING") {
      throw new Error("Withdrawal request not found or not in pending status.");
    }

    if (withdrawal.payoutMethod === "PAYSTACK_TRANSFER") {
      // Extension point for automated transfer:
      // const paymentClient = getPaymentClient();
      // await paymentClient.initiateTransfer(...);
    }

    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "COMPLETED",
          payoutReference,
          completedAt: new Date(),
          completedByUserId: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "WITHDRAWAL_COMPLETE",
          details: JSON.stringify({
            withdrawalId,
            amount: withdrawal.amountPesewas,
            reference: payoutReference,
            notes,
          }),
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
 * Rejects/fails a pending withdrawal request and releases back covered ledgers.
 */
export async function rejectWithdrawalAction(withdrawalId: string, notes?: string) {
  try {
    const adminId = await verifyAdmin();

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.status !== "PENDING") {
      throw new Error("Withdrawal request not found or not in pending status.");
    }

    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          completedByUserId: adminId,
        },
      });

      // Release the locked ledger entries back to AVAILABLE
      await tx.ledger.updateMany({
        where: {
          id: { in: withdrawal.ledgerIds },
        },
        data: {
          status: "AVAILABLE",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "WITHDRAWAL_REJECT",
          details: JSON.stringify({
            withdrawalId,
            amount: withdrawal.amountPesewas,
            notes,
          }),
        },
      });
    });

    revalidatePath("/admin/commissions");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
