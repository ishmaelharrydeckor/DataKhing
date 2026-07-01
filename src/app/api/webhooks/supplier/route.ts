import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndCreateCommission, checkAndReverseCommission } from "@/app/actions/commission";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("X-Signature") || "";
    const secret = process.env.SUPPLIER_WEBHOOK_SECRET || "";

    // 1. Verify HMAC SHA256 signature
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      console.warn("Unauthorized webhook attempt - signature mismatch.");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log(`Supplier Webhook Received: Event [${event}] for reference: ${data.orderReference || data.purchaseId}`);

    // 2. Identify corresponding local order
    const order = await db.order.findFirst({
      where: {
        OR: [
          { supplierPurchaseId: data.purchaseId },
          { supplierOrderRef: data.orderReference },
          { id: data.idempotencyKey },
        ],
      },
      include: { user: true },
    });

    if (!order) {
      console.warn("Order matching webhook payload parameters not found in local database.");
      return new Response("Order not found", { status: 200 }); // Return 200 so supplier stops sending retries
    }

    // Skip if already finalized
    if (order.status === "DELIVERED" || order.status === "REFUNDED") {
      return new Response("Already processed", { status: 200 });
    }

    // 3. Map events and update status
    let finalStatus = order.status;

    if (event === "order.completed") {
      finalStatus = "DELIVERED";
      
      await db.order.update({
        where: { id: order.id },
        data: { status: finalStatus },
      });
      await checkAndCreateCommission(order.id);
    } else if (event === "order.failed" || event === "order.refunded") {
      finalStatus = event === "order.failed" ? "FAILED" : "REFUNDED";

      // If user paid from wallet, refund the deducted amount
      const alreadyRefunded = await db.walletTransaction.findFirst({
        where: {
          userId: order.userId || "",
          type: "TOPUP",
          referenceOrderId: order.id,
        },
      });

      if (order.userId && !alreadyRefunded) {
        await db.$transaction(async (tx) => {
          // Refund user
          const u = await tx.user.update({
            where: { id: order.userId! },
            data: { walletBalance: { increment: order.amountPaid } },
          });

          // Log transaction
          await tx.walletTransaction.create({
            data: {
              userId: order.userId!,
              type: "TOPUP", // credited back
              amountPesewas: order.amountPaid,
              balanceAfter: u.walletBalance,
              referenceOrderId: order.id,
            },
          });

          // Audit log adjustment
          await tx.auditLog.create({
            data: {
              action: "AUTO_REFUND_FAIL",
              details: JSON.stringify({
                orderId: order.id,
                refundedAmount: order.amountPaid,
                userWalletAfter: u.walletBalance,
              }),
            },
          });

          // Update order
          await tx.order.update({
            where: { id: order.id },
            data: { status: finalStatus },
          });
        });
      } else {
        await db.order.update({
          where: { id: order.id },
          data: { status: finalStatus },
        });
      }

      await checkAndReverseCommission(order.id);
    }

    revalidatePath(`/order/${order.id}`);
    revalidatePath("/admin/orders");
    
    return new Response("Webhook processed", { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
