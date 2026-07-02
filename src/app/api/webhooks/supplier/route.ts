import crypto from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createCascadingLedgerEntries } from "@/lib/ledger";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // raw bytes — nothing touches this first

    const signature = req.headers.get("x-webhook-signature"); // Headers API is case-insensitive already
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const expected = crypto
      .createHmac("sha256", process.env.SUPPLIER_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    const isValid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!isValid) {
      console.warn("Unauthorized webhook attempt - signature mismatch.");
      return new Response("Invalid signature", { status: 401 });
    }

    const eventData = JSON.parse(rawBody);
    const { event, data } = eventData;

    console.log(`Supplier Webhook Received: Event [${event}] for reference: ${data?.reference || data?.id}`);

    // If it's a withdrawal event, log and ignore as it pertains to storefront features
    if (event.startsWith("withdrawal.")) {
      console.log(`Log and ignore withdrawal event type: ${event}`);
      return new Response("OK", { status: 200 });
    }

    // 2. Identify corresponding local order
    const order = await db.order.findFirst({
      where: {
        OR: [
          { supplierPurchaseId: data.id },
          { supplierOrderRef: data.reference },
        ],
      },
      include: { user: true },
    });

    if (!order) {
      console.warn("Order matching webhook payload parameters not found in local database.");
      return new Response("Order not found", { status: 200 });
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
      await createCascadingLedgerEntries(order.id);
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

      // Mark affected ledger records as FAILED if any exist
      await db.ledger.updateMany({
        where: { orderId: order.id },
        data: { status: "WITHDRAWN" }, // Effectively voiding it from available ledger pool
      });
    }

    revalidatePath(`/order/${order.id}`);
    revalidatePath("/admin/orders");
    
    return new Response("Webhook processed", { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
