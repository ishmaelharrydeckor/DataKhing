"use server";

import { db } from "@/lib/db";
import { getSupplierClient } from "@/lib/supplier";
import { getPaymentClient } from "@/lib/payment";
import { validatePhoneNumber, getNetworkFromPhone, SITE_CONFIG } from "@/lib/site-config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkAndCreateCommission, checkAndReverseCommission } from "./commission";

// Reward configuration (Ghanaian reseller details)
const REFERRAL_CASHBACK_PERCENT = 5; // 5% cashback to referrer

export async function createOrderAction(formData: {
  bundleId: string;
  recipientPhone: string;
  paymentMethod: "WALLET" | "PAYSTACK";
  guestEmail?: string;
  referrerCode?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    const userRole = session?.user ? (session.user as any).role : "CUSTOMER";

    // 1. Fetch Bundle
    const bundle = await db.bundle.findUnique({
      where: { id: formData.bundleId },
    });
    if (!bundle) {
      return { success: false, error: "Bundle not found." };
    }

    // 2. Validate Network matching phone
    const phoneNetwork = getNetworkFromPhone(formData.recipientPhone);
    if (!phoneNetwork || phoneNetwork !== bundle.network) {
      return {
        success: false,
        error: `Phone number is not a valid ${bundle.network} number.`,
      };
    }

    // 3. Basic Format check
    if (!validatePhoneNumber(formData.recipientPhone, bundle.network as any)) {
      return { success: false, error: "Invalid phone number format." };
    }

    // 4. Calculate Sell Price based on User Tier
    let finalPrice = bundle.sellPricePesewas;
    if (userRole === "AGENT") {
      finalPrice = bundle.agentPricePesewas;
    } else if (userRole === "ADMIN") {
      finalPrice = bundle.supplierCostPesewas; // Admin gets at cost for testing/convenience
    }

    // 5. Determine email for payment receipt
    const customerEmail = session?.user?.email || formData.guestEmail || "guest@datakhing.com";

    // 6. Handle Wallet Payment
    if (formData.paymentMethod === "WALLET") {
      if (!userId) {
        return { success: false, error: "Wallet payments require logging in." };
      }

      // Check balance
      const freshUser = await db.user.findUnique({ where: { id: userId } });
      if (!freshUser || freshUser.walletBalance < finalPrice) {
        return { success: false, error: "Insufficient wallet balance. Please top up." };
      }

      // Deduct balance and create Order in a transaction
      const order = await db.$transaction(async (tx) => {
        // Deduct
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { walletBalance: { decrement: finalPrice } },
        });

        // Create order
        const createdOrder = await tx.order.create({
          data: {
            userId,
            bundleId: bundle.id,
            recipientPhone: formData.recipientPhone,
            status: "PENDING",
            amountPaid: finalPrice,
          },
        });

        // Record Wallet Transaction
        await tx.walletTransaction.create({
          data: {
            userId,
            type: "PURCHASE",
            amountPesewas: -finalPrice,
            balanceAfter: updatedUser.walletBalance,
            referenceOrderId: createdOrder.id,
          },
        });

        return createdOrder;
      });

      // Async Upstream Placement (in mock mode, this starts simulation)
      try {
        const supplierClient = getSupplierClient();
        const placementResult = await supplierClient.placeOrder(
          bundle.id,
          formData.recipientPhone,
          order.id
        );

        const statusVal = placementResult.status === "PENDING" ? "PROCESSING" : placementResult.status;

        await db.order.update({
          where: { id: order.id },
          data: {
            supplierOrderRef: placementResult.supplierOrderRef,
            status: statusVal,
          },
        });

        if (statusVal === "DELIVERED") {
          await checkAndCreateCommission(order.id);
        }

        // Trigger referral rewards if the user was referred
        const freshUserObj = await db.user.findUnique({ where: { id: userId }, select: { referredById: true } });
        if (freshUserObj?.referredById) {
          const rewardAmount = Math.floor((finalPrice * REFERRAL_CASHBACK_PERCENT) / 100);
          
          await db.$transaction(async (tx) => {
            const referrer = await tx.user.update({
              where: { id: freshUserObj.referredById! },
              data: { walletBalance: { increment: rewardAmount } },
            });

            await tx.walletTransaction.create({
              data: {
                userId: freshUserObj.referredById!,
                type: "REFERRAL_CREDIT",
                amountPesewas: rewardAmount,
                balanceAfter: referrer.walletBalance,
                referenceOrderId: order.id,
              },
            });
            
            await tx.referral.upsert({
              where: { referredUserId: userId },
              create: {
                referrerId: freshUserObj.referredById!,
                referredUserId: userId,
                status: "COMPLETED",
              },
              update: {
                status: "COMPLETED",
              }
            });
          });
        }

      } catch (err) {
        console.error("Failed to send order upstream:", err);
      }

      revalidatePath("/dashboard");
      return { success: true, orderId: order.id };
    }

    // 7. Handle Paystack Mobile Money Integration
    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/buy/callback`;
    const metadata = {
      bundleId: bundle.id,
      recipientPhone: formData.recipientPhone,
      userId,
      guestEmail: customerEmail,
      referrerCode: formData.referrerCode || null,
      orderPrice: finalPrice,
    };

    const paymentClient = getPaymentClient();
    const payResult = await paymentClient.initializeTransaction(
      customerEmail,
      finalPrice,
      callbackUrl,
      metadata
    );

    // Create temporary order marked as PENDING (waiting for payment verification)
    const pendingOrder = await db.order.create({
      data: {
        userId,
        bundleId: bundle.id,
        recipientPhone: formData.recipientPhone,
        status: "PENDING",
        paystackRef: payResult.reference,
        amountPaid: finalPrice,
      },
    });

    return {
      success: true,
      checkoutUrl: payResult.authorizationUrl,
      orderId: pendingOrder.id,
    };
  } catch (error: any) {
    console.error("createOrderAction error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function verifyOrderPaymentAction(paystackRef: string) {
  try {
    const paymentClient = getPaymentClient();
    const verification = await paymentClient.verifyTransaction(paystackRef);

    // Find our order
    const order = await db.order.findUnique({
      where: { paystackRef },
      include: { user: true, bundle: true },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    // If order is already processed, skip
    if (order.status !== "PENDING") {
      return { success: true, orderId: order.id, status: order.status };
    }

    if (verification.success) {
      // 1. Mark as PAID (or PROCESSING/DELIVERED) and call supplier client
      const supplierClient = getSupplierClient();
      const placementResult = await supplierClient.placeOrder(
        order.bundleId,
        order.recipientPhone,
        order.id
      );

      const finalStatus = placementResult.status === "PENDING" ? "PROCESSING" : placementResult.status;

      const updatedOrder = await db.order.update({
        where: { id: order.id },
        data: {
          status: finalStatus,
          supplierOrderRef: placementResult.supplierOrderRef,
        },
      });

      if (finalStatus === "DELIVERED") {
        await checkAndCreateCommission(order.id);
      }

      // 2. Wallet transaction mapping (record transaction as purchase)
      if (order.userId) {
        await db.walletTransaction.create({
          data: {
            userId: order.userId,
            type: "PURCHASE",
            amountPesewas: -order.amountPaid,
            balanceAfter: order.user?.walletBalance ?? 0, // Since it was paid via Paystack, user wallet is untouched
            referenceOrderId: order.id,
          },
        });

        // Trigger referral rewards if the user was referred
        const userObj = await db.user.findUnique({ where: { id: order.userId }, select: { referredById: true } });
        if (userObj?.referredById) {
          const rewardAmount = Math.floor((order.amountPaid * REFERRAL_CASHBACK_PERCENT) / 100);
          
          await db.$transaction(async (tx) => {
            const referrer = await tx.user.update({
              where: { id: userObj.referredById! },
              data: { walletBalance: { increment: rewardAmount } },
            });

            await tx.walletTransaction.create({
              data: {
                userId: userObj.referredById!,
                type: "REFERRAL_CREDIT",
                amountPesewas: rewardAmount,
                balanceAfter: referrer.walletBalance,
                referenceOrderId: order.id,
              },
            });
            
            await tx.referral.upsert({
              where: { referredUserId: order.userId! },
              create: {
                referrerId: userObj.referredById!,
                referredUserId: order.userId!,
                status: "COMPLETED",
              },
              update: {
                status: "COMPLETED",
              }
            });
          });
        }
      }

      return { success: true, orderId: order.id, status: finalStatus };
    } else {
      // Payment failed
      const updatedOrder = await db.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
        },
      });
      return { success: false, orderId: updatedOrder.id, status: "FAILED" };
    }
  } catch (error: any) {
    console.error("verifyOrderPaymentAction error:", error);
    return { success: false, error: error.message || "Verification failed." };
  }
}

export async function topupWalletAction(amountPesewas: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Authentication required." };
    }
    const userId = (session.user as any).id;

    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/wallet/callback`;
    const metadata = {
      userId,
      type: "WALLET_TOPUP",
      topupAmount: amountPesewas,
    };

    const paymentClient = getPaymentClient();
    const payResult = await paymentClient.initializeTransaction(
      session.user.email!,
      amountPesewas,
      callbackUrl,
      metadata
    );

    return {
      success: true,
      checkoutUrl: payResult.authorizationUrl,
      reference: payResult.reference,
    };
  } catch (error: any) {
    console.error("topupWalletAction error:", error);
    return { success: false, error: error.message || "Failed to initialize wallet topup." };
  }
}

export async function verifyWalletTopupAction(reference: string, amountPesewas: number, webhookUserId?: string) {
  try {
    let userId = webhookUserId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return { success: false, error: "Authentication required." };
      }
      userId = (session.user as any).id;
    }

    const finalUserId = userId as string;

    // Check if this wallet transaction was already handled
    const existingTx = await db.walletTransaction.findFirst({
      where: {
        userId: finalUserId,
        type: "TOPUP",
        paymentRef: reference,
      },
    });

    if (existingTx) {
      return { success: true, balance: existingTx.balanceAfter, amountPesewas: existingTx.amountPesewas };
    }

    const paymentClient = getPaymentClient();
    const verification = await paymentClient.verifyTransaction(reference);

    if (verification.success) {
      const finalAmount = verification.amountPaidPesewas > 0 ? verification.amountPaidPesewas : amountPesewas;
      const updatedUser = await db.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: finalUserId },
          data: {
            walletBalance: { increment: finalAmount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId: finalUserId,
            type: "TOPUP",
            amountPesewas: finalAmount,
            balanceAfter: u.walletBalance,
            paymentRef: reference,
          },
        });

        return u;
      });

      return { success: true, balance: updatedUser.walletBalance, amountPesewas: finalAmount };
    }

    return { success: false, error: "Verification failed." };
  } catch (error: any) {
    console.error("verifyWalletTopupAction error:", error);
    return { success: false, error: error.message || "Wallet topup verification failed." };
  }
}

export async function getOrderDetailsAction(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { bundle: true },
  });
}

export async function pollOrderStatusAction(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return { success: false, error: "Order not found" };

    // If already finalized, return it
    if (order.status === "DELIVERED" || order.status === "FAILED" || order.status === "REFUNDED") {
      return { success: true, status: order.status };
    }

    if (order.supplierOrderRef) {
      const supplierClient = getSupplierClient();
      const currentStatus = await supplierClient.getOrderStatus(order.supplierOrderRef);

      if (currentStatus !== order.status) {
        const updated = await db.order.update({
          where: { id: orderId },
          data: { status: currentStatus },
        });

        if (currentStatus === "DELIVERED") {
          await checkAndCreateCommission(orderId);
        } else if (currentStatus === "FAILED") {
          await checkAndReverseCommission(orderId);
        }

        return { success: true, status: updated.status };
      }
    }

    return { success: true, status: order.status };
  } catch (error) {
    console.error("pollOrderStatusAction error:", error);
    return { success: false, status: "PENDING" };
  }
}

export async function applyForAgentAction(businessName: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Sign in required" };
    const userId = (session.user as any).id;

    // Check if user already applied
    const existing = await db.agentApplication.findUnique({ where: { userId } });
    if (existing) {
      return { success: false, error: `Your application is currently ${existing.status.toLowerCase()}.` };
    }

    await db.agentApplication.create({
      data: {
        userId,
        businessName,
        status: "PENDING",
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit application." };
  }
}

export async function archiveWalletTransactionAction(txId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Authentication required." };
    const userId = (session.user as any).id;

    const tx = await db.walletTransaction.findUnique({
      where: { id: txId },
    });

    if (!tx || tx.userId !== userId) {
      return { success: false, error: "Transaction not found." };
    }

    await db.walletTransaction.update({
      where: { id: txId },
      data: { isArchived: true },
    });

    return { success: true };
  } catch (error: any) {
    console.error("archiveWalletTransactionAction error:", error);
    return { success: false, error: error.message || "Failed to clear transaction." };
  }
}
