import { SITE_CONFIG, formatPhone } from "./site-config";
import { db } from "./db";

export interface SupplierBundle {
  id: string;
  network: string;
  label: string;
  dataAmountGB: number;
  supplierCostPesewas: number;
}

export interface SupplierOrderResult {
  supplierOrderRef: string;
  status: "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";
}

export interface SupplierClient {
  getCatalog(): Promise<SupplierBundle[]>;
  placeOrder(
    bundleId: string,
    recipientPhone: string,
    idempotencyKey: string
  ): Promise<SupplierOrderResult>;
  getOrderStatus(supplierOrderRef: string): Promise<"PENDING" | "PROCESSING" | "DELIVERED" | "FAILED">;
}

class MockSupplierClient implements SupplierClient {
  async getCatalog(): Promise<SupplierBundle[]> {
    return [
      { id: "mock-mtn-1gb", network: "MTN", label: "MTN 1GB (Non-expiry)", dataAmountGB: 1.0, supplierCostPesewas: 200 },
      { id: "mock-mtn-2.5gb", network: "MTN", label: "MTN 2.5GB (Non-expiry)", dataAmountGB: 2.5, supplierCostPesewas: 400 },
      { id: "mock-mtn-5gb", network: "MTN", label: "MTN 5GB (Non-expiry)", dataAmountGB: 5.0, supplierCostPesewas: 750 },
      { id: "mock-mtn-10gb", network: "MTN", label: "MTN 10GB (Non-expiry)", dataAmountGB: 10.0, supplierCostPesewas: 1400 },
      { id: "mock-mtn-20gb", network: "MTN", label: "MTN 20GB (Non-expiry)", dataAmountGB: 20.0, supplierCostPesewas: 2600 },

      { id: "mock-tel-1.5gb", network: "TELECEL", label: "Telecel 1.5GB (30 Days)", dataAmountGB: 1.5, supplierCostPesewas: 220 },
      { id: "mock-tel-3gb", network: "TELECEL", label: "Telecel 3GB (30 Days)", dataAmountGB: 3.0, supplierCostPesewas: 420 },
      { id: "mock-tel-8gb", network: "TELECEL", label: "Telecel 8GB (30 Days)", dataAmountGB: 8.0, supplierCostPesewas: 1000 },
      { id: "mock-tel-15gb", network: "TELECEL", label: "Telecel 15GB (30 Days)", dataAmountGB: 15.0, supplierCostPesewas: 1800 },

      { id: "mock-at-2gb", network: "AIRTELTIGO", label: "AirtelTigo 2GB (Non-expiry)", dataAmountGB: 2.0, supplierCostPesewas: 200 },
      { id: "mock-at-5gb", network: "AIRTELTIGO", label: "AirtelTigo 5GB (Non-expiry)", dataAmountGB: 5.0, supplierCostPesewas: 450 },
      { id: "mock-at-12gb", network: "AIRTELTIGO", label: "AirtelTigo 12GB (Non-expiry)", dataAmountGB: 12.0, supplierCostPesewas: 1000 },
      { id: "mock-at-25gb", network: "AIRTELTIGO", label: "AirtelTigo 25GB (Non-expiry)", dataAmountGB: 25.0, supplierCostPesewas: 2000 },
    ];
  }

  async placeOrder(
    bundleId: string,
    recipientPhone: string,
    idempotencyKey: string
  ): Promise<SupplierOrderResult> {
    const ref = `SUP-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    if (recipientPhone.endsWith("999")) {
      return {
        supplierOrderRef: ref,
        status: "FAILED",
      };
    }
    return {
      supplierOrderRef: ref,
      status: "PENDING",
    };
  }

  async getOrderStatus(supplierOrderRef: string): Promise<"PENDING" | "PROCESSING" | "DELIVERED" | "FAILED"> {
    const rand = Math.random();
    if (rand < 0.15) return "PROCESSING";
    if (rand < 0.20) return "FAILED";
    return "DELIVERED";
  }
}

class RealSupplierClient implements SupplierClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SUPPLIER_API_KEY || "";
    this.baseUrl = process.env.SUPPLIER_API_BASE_URL || "https://api.datamartgh.shop/api";
  }

  private getMaskedKey(): string {
    if (!this.apiKey) return "NONE";
    return `*...${this.apiKey.slice(-4)}`;
  }

  private async isThrottled(): Promise<boolean> {
    const account = await db.supplierAccount.findUnique({
      where: { id: "default" },
    });
    if (!account) return false;
    if (account.rateLimitRemaining < 10 && account.rateLimitResetAt > new Date()) {
      return true;
    }
    return false;
  }

  private async updateAccountLimits(balanceAfter: number, rateLimit: { limit: number; remaining: number; resetInSeconds: number }) {
    try {
      const balancePesewas = Math.round(balanceAfter * 100);
      const rateLimitResetAt = new Date(Date.now() + rateLimit.resetInSeconds * 1000);
      
      await db.supplierAccount.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          balancePesewas,
          rateLimitRemaining: rateLimit.remaining,
          rateLimitResetAt,
        },
        update: {
          balancePesewas,
          rateLimitRemaining: rateLimit.remaining,
          rateLimitResetAt,
        },
      });
    } catch (e) {
      console.error("Failed to update SupplierAccount limits in DB:", e);
    }
  }

  async getCatalog(): Promise<SupplierBundle[]> {
    const throttled = await this.isThrottled();
    if (throttled) {
      console.warn("Supplier API catalog sync throttled due to low rate limit remaining. Using local cached db data.");
      // Fetch from DB cached list
      const localBundles = await db.bundle.findMany({ where: { active: true } });
      return localBundles.map(b => ({
        id: b.id,
        network: b.network,
        label: b.label,
        dataAmountGB: b.dataAmountGB,
        supplierCostPesewas: b.supplierCostPesewas,
      }));
    }

    try {
      const res = await fetch(`${this.baseUrl}/bundles`, {
        method: "GET",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch catalog. HTTP Code: ${res.status}`);
      }

      const data = await res.json();
      
      // Update account status if metadata returned in catalog fetch
      if (data.balanceAfter && data.rateLimit) {
        await this.updateAccountLimits(data.balanceAfter, data.rateLimit);
      }

      // Format response bundles to match client interface
      const bundles: any[] = data.bundles || [];
      return bundles.map((b: any) => ({
        id: b.id,
        network: b.network === "YELLO" ? "MTN" : b.network === "AT_PREMIUM" ? "AIRTELTIGO" : b.network,
        label: b.label,
        dataAmountGB: parseFloat(b.capacity),
        supplierCostPesewas: Math.round(parseFloat(b.price) * 100),
      }));

    } catch (error) {
      console.error("getCatalog error:", error);
      // Fallback to local DB
      const localBundles = await db.bundle.findMany({ where: { active: true } });
      return localBundles.map(b => ({
        id: b.id,
        network: b.network,
        label: b.label,
        dataAmountGB: b.dataAmountGB,
        supplierCostPesewas: b.supplierCostPesewas,
      }));
    }
  }

  async placeOrder(
    bundleId: string,
    recipientPhone: string,
    idempotencyKey: string
  ): Promise<SupplierOrderResult> {
    const maskedKey = this.getMaskedKey();
    console.log(`RealSupplierClient.placeOrder called. Key: ${maskedKey}, Idempotency: ${idempotencyKey}`);

    const bundle = await db.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) {
      throw new Error("Local Bundle metadata matching ID not found.");
    }

    // Map network codes
    const networkMap: Record<string, string> = {
      MTN: "YELLO",
      TELECEL: "TELECEL",
      AIRTELTIGO: "AT_PREMIUM",
    };
    const networkCode = networkMap[bundle.network] || bundle.network;
    const capacityCode = String(bundle.dataAmountGB);
    const normalizedPhone = formatPhone(recipientPhone);

    const body = {
      phoneNumber: normalizedPhone,
      network: networkCode,
      capacity: capacityCode,
      gateway: "wallet",
    };

    // Fetch helper with timeout and retry backoff
    const fetchAttempt = async (attempt: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

      try {
        const response = await fetch(`${this.baseUrl}/purchase`, {
          method: "POST",
          headers: {
            "X-API-Key": this.apiKey,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let response: Response;
    try {
      response = await fetchAttempt(1);
    } catch (e: any) {
      // Retry once on timeout/network failure
      console.warn(`Attempt 1 failed: ${e.message || "Timeout"}. Retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        response = await fetchAttempt(2);
      } catch (retryErr) {
        console.error("Retry attempt 2 failed:", retryErr);
        // Fallback to pending state for webhook/polling resolution
        return { supplierOrderRef: "", status: "PENDING" };
      }
    }

    const payload = await response.json();

    // Handle 5xx errors or server timeout failures
    if (response.status >= 500) {
      console.error(`Upstream returned HTTP status ${response.status}. Payload:`, payload);
      return { supplierOrderRef: "", status: "PENDING" };
    }

    // Handle duplicate requests (already processed)
    if (response.status === 409) {
      console.warn(`Idempotency conflict (409) detected for order key: ${idempotencyKey}`);
      // Query local order details to prevent duplicate processing
      const existingOrder = await db.order.findUnique({
        where: { id: idempotencyKey },
      });
      return {
        supplierOrderRef: existingOrder?.supplierOrderRef || "DUPLICATE",
        status: (existingOrder?.status as any) || "PENDING",
      };
    }

    // Handle standard API errors
    if (!response.ok || payload.status === "error") {
      const errorMessage = payload.message || "Unknown supplier error";
      
      // Check for insufficient balanceSpecifically
      if (errorMessage.toLowerCase().includes("balance") || response.status === 400 && payload.requiredAmount) {
        console.error(`[ALARM/CRITICAL] Supplier account balance is insufficient! Required: ${payload.requiredAmount}, Balance: ${payload.currentBalance}`);
        
        // Update local Order record as FAILED
        await db.order.update({
          where: { id: idempotencyKey },
          data: { status: "FAILED" },
        });

        throw new Error("This item is temporarily unavailable, please try again shortly");
      }

      throw new Error(errorMessage);
    }

    // Process successful response payload details
    const { purchaseId, orderReference, balanceAfter, orderStatus, rateLimit } = payload;

    // Update locally stored Order reference
    await db.order.update({
      where: { id: idempotencyKey },
      data: {
        supplierOrderRef: orderReference,
        supplierPurchaseId: purchaseId,
        idempotencyKey: idempotencyKey,
        status: orderStatus === "completed" ? "DELIVERED" : orderStatus === "failed" ? "FAILED" : "PROCESSING",
      },
    });

    if (balanceAfter && rateLimit) {
      await this.updateAccountLimits(balanceAfter, rateLimit);
    }

    return {
      supplierOrderRef: orderReference,
      status: orderStatus === "completed" ? "DELIVERED" : orderStatus === "failed" ? "FAILED" : "PROCESSING",
    };
  }

  async getOrderStatus(supplierOrderRef: string): Promise<"PENDING" | "PROCESSING" | "DELIVERED" | "FAILED"> {
    try {
      const res = await fetch(`${this.baseUrl}/order-status/${encodeURIComponent(supplierOrderRef)}`, {
        method: "GET",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return "PENDING";
      const payload = await res.json();
      
      if (payload.orderStatus === "completed") return "DELIVERED";
      if (payload.orderStatus === "failed") return "FAILED";
      return "PROCESSING";
    } catch (e) {
      console.error("getOrderStatus failed:", e);
      return "PROCESSING";
    }
  }
}

let supplierClientInstance: SupplierClient | null = null;

export function getSupplierClient(): SupplierClient {
  if (!supplierClientInstance) {
    if (SITE_CONFIG.MOCK_MODE) {
      supplierClientInstance = new MockSupplierClient();
    } else {
      supplierClientInstance = new RealSupplierClient();
    }
  }
  return supplierClientInstance;
}
