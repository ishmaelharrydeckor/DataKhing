import { SITE_CONFIG } from "./site-config";

export interface PaymentInitializationResult {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: "success" | "failed" | "pending";
  amountPaidPesewas: number;
}

export interface PaymentClient {
  initializeTransaction(
    email: string,
    amountPesewas: number,
    callbackUrl: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitializationResult>;
  
  verifyTransaction(reference: string): Promise<PaymentVerificationResult>;
  refundTransaction(reference: string): Promise<boolean>;
}

class MockPaymentClient implements PaymentClient {
  async initializeTransaction(
    email: string,
    amountPesewas: number,
    callbackUrl: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitializationResult> {
    const reference = `PAY-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockCheckoutUrl = `/buy/mock-checkout?reference=${reference}&amount=${amountPesewas}&email=${encodeURIComponent(
      email
    )}&callbackUrl=${encodeURIComponent(callbackUrl)}&metadata=${encodeURIComponent(
      JSON.stringify(metadata || {})
    )}`;

    return {
      authorizationUrl: mockCheckoutUrl,
      reference,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
    const isMockRef = reference.startsWith("PAY-MOCK");
    const isFailed = reference.includes("FAIL");
    
    return {
      success: isMockRef && !isFailed,
      status: isFailed ? "failed" : "success",
      amountPaidPesewas: 0,
    };
  }

  async refundTransaction(reference: string): Promise<boolean> {
    console.log(`MockPaymentClient: Refunded transaction ${reference}`);
    return true;
  }
}

class RealPaymentClient implements PaymentClient {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  }

  async initializeTransaction(
    email: string,
    amountPesewas: number,
    callbackUrl: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitializationResult> {
    console.log("RealPaymentClient.initializeTransaction called", { email, amountPesewas, callbackUrl });
    
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountPesewas,
        callback_url: callbackUrl,
        metadata,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(data.message || "Failed to initialize payment with Paystack");
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
    console.log("RealPaymentClient.verifyTransaction called", reference);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return {
        success: false,
        status: "failed",
        amountPaidPesewas: 0,
      };
    }

    const paystackStatus = data.data.status;
    const amount = data.data.amount;

    return {
      success: paystackStatus === "success",
      status: paystackStatus,
      amountPaidPesewas: amount,
    };
  }

  async refundTransaction(reference: string): Promise<boolean> {
    console.log("RealPaymentClient.refundTransaction called", reference);
    try {
      const res = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction: reference,
        }),
      });

      const data = await res.json();
      return res.ok && data.status === true;
    } catch (e) {
      console.error("Paystack refund request failed:", e);
      return false;
    }
  }
}

let paymentClientInstance: PaymentClient | null = null;

export function getPaymentClient(): PaymentClient {
  if (!paymentClientInstance) {
    if (SITE_CONFIG.MOCK_MODE) {
      paymentClientInstance = new MockPaymentClient();
    } else {
      paymentClientInstance = new RealPaymentClient();
    }
  }
  return paymentClientInstance;
}
