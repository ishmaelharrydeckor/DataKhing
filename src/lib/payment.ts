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
}

class MockPaymentClient implements PaymentClient {
  async initializeTransaction(
    email: string,
    amountPesewas: number,
    callbackUrl: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitializationResult> {
    const reference = `PAY-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // In mock mode, we redirect to a local route that simulates the checkout experience
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
    // In mock mode, we can inspect a global/temporary mock server state, 
    // or just parse the reference / mock store.
    // For testing, let's default to successful mock checkouts unless the reference contains "FAIL" or is marked failed in a global mock store.
    // To make it fully functional and reliable, we'll store the simulated checkout status in a mock database table or simply default to success
    // unless simulated explicitly. Let's return success for mock references that are paid.
    // We can check if the reference is in our local cache or just return success if reference starts with "PAY-MOCK".
    const isMockRef = reference.startsWith("PAY-MOCK");
    const isFailed = reference.includes("FAIL");
    
    return {
      success: isMockRef && !isFailed,
      status: isFailed ? "failed" : "success",
      amountPaidPesewas: 0, // Will be filled dynamically by transaction details
    };
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
    // TODO: Implement actual Paystack Transaction Initialize API call
    console.log("RealPaymentClient.initializeTransaction called", { email, amountPesewas, callbackUrl });
    
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountPesewas, // Paystack requires amount in lowest currency unit (pesewas/kobo)
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
    // TODO: Implement actual Paystack Transaction Verify API call
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
    const amount = data.data.amount; // in kobo/pesewas

    return {
      success: paystackStatus === "success",
      status: paystackStatus,
      amountPaidPesewas: amount,
    };
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
