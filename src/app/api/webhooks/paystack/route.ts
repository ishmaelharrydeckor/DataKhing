import { createHmac } from "crypto";
import { verifyOrderPaymentAction, verifyWalletTopupAction } from "@/app/actions/orders";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || req.headers.get("X-Paystack-Signature") || "";
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    // 1. Verify HMAC SHA512 signature from Paystack
    const hmac = createHmac("sha512", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      console.warn("Paystack Webhook unauthorized attempt - signature mismatch.");
      return new Response("Invalid signature", { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    // 2. Process successful charges
    if (event === "charge.success") {
      const reference = data.reference;
      const amountPesewas = data.amount; // Paystack sends amounts in lowest unit (pesewas)
      const metadata = data.metadata || {};

      console.log(`Paystack Webhook: Received successful charge [${reference}] of amount ${amountPesewas} pesewas`);

      if (metadata.type === "WALLET_TOPUP") {
        await verifyWalletTopupAction(reference, amountPesewas);
      } else {
        await verifyOrderPaymentAction(reference);
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error: any) {
    console.error("Paystack Webhook handler error:", error);
    return new Response("Internal Server Error", { status: 505 });
  }
}
