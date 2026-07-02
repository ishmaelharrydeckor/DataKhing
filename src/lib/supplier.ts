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
    const ref = `API-MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
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
    this.baseUrl = process.env.SUPPLIER_API_BASE_URL || "https://api.datamartgh.shop/api/store/v1";
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
    if (account.rateLimitRemaining < 5 && account.rateLimitResetAt > new Date()) {
      return true;
    }
    return false;
  }

  private async updateAccountLimits(balanceAfter: number, rateLimit?: { limit: number; remaining: number; resetInSeconds: number }) {
    try {
      const balancePesewas = Math.round(balanceAfter * 100);
      
      const updateData: any = {
        balancePesewas,
      };

      if (rateLimit) {
        updateData.rateLimitRemaining = rateLimit.remaining;
        updateData.rateLimitResetAt = new Date(Date.now() + rateLimit.resetInSeconds * 1000);
      }

      await db.supplierAccount.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          balancePesewas,
          rateLimitRemaining: rateLimit ? rateLimit.remaining : 60,
          rateLimitResetAt: rateLimit ? new Date(Date.now() + rateLimit.resetInSeconds * 1000) : new Date(),
        },
        update: updateData,
      });
    } catch (e) {
      console.error("Failed to update SupplierAccount limits in DB:", e);
    }
  }

  async getCatalog(): Promise<SupplierBundle[]> {
    const throttled = await this.isThrottled();
    if (throttled) {
      console.warn("Supplier API catalog sync throttled due to low rate limit remaining. Using local cached db data.");
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
      const res = await fetch(`${this.baseUrl}/products`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        await this.handleHttpError(res);
      }

      const payload = await res.json();
      
      const bundles: any[] = payload.data || payload.products || [];
      return bundles.map((b: any) => {
        let mappedNetwork = b.network;
        if (b.network === "YELLO") mappedNetwork = "MTN";
        else if (b.network === "AT_PREMIUM") mappedNetwork = "AIRTELTIGO";

        return {
          id: b.id || b.sku || `sku-${b.capacity}-${b.network}`,
          network: mappedNetwork,
          label: b.label || `${mappedNetwork} ${b.capacity}GB`,
          dataAmountGB: typeof b.capacity === "number" ? b.capacity : parseFloat(b.capacity),
          supplierCostPesewas: Math.round(parseFloat(b.price) * 100),
        };
      });

    } catch (error) {
      console.error("getCatalog error:", error);
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

    const networkMap: Record<string, string> = {
      MTN: "YELLO",
      TELECEL: "TELECEL",
      AIRTELTIGO: "AT_PREMIUM",
    };
    const networkCode = networkMap[bundle.network] || bundle.network;
    const capacityNum = bundle.dataAmountGB;
    const normalizedPhone = formatPhone(recipientPhone);

    const body = {
      phoneNumber: normalizedPhone,
      network: networkCode,
      capacity: capacityNum,
    };

    const fetchAttempt = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(`${this.baseUrl}/orders`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
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
      response = await fetchAttempt();
    } catch (e: any) {
      console.warn(`Attempt 1 failed: ${e.message || "Timeout"}. Retrying in 2s with same idempotency key...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        response = await fetchAttempt();
      } catch (retryErr) {
        console.error("Retry attempt 2 failed:", retryErr);
        return { supplierOrderRef: "", status: "PENDING" };
      }
    }

    // Handle 5xx/503 errors
    if (response.status >= 500) {
      console.error(`Upstream returned HTTP status ${response.status}`);
      return { supplierOrderRef: "", status: "PENDING" };
    }

    const payload = await response.json();

    if (!response.ok) {
      await this.handleErrorPayload(response.status, payload, idempotencyKey);
    }

    // Success response parsing
    const orderData = payload.data?.order || payload.order;
    const walletData = payload.data?.wallet || payload.wallet;

    if (walletData && walletData.balanceAfter !== undefined) {
      await this.updateAccountLimits(walletData.balanceAfter);
    }

    const statusVal = orderData.status === "completed" || orderData.status === "success" 
      ? "DELIVERED" 
      : orderData.status === "failed" 
      ? "FAILED" 
      : "PROCESSING";

    return {
      supplierOrderRef: orderData.reference || orderData.id,
      status: statusVal,
    };
  }

  async getOrderStatus(supplierOrderRef: string): Promise<"PENDING" | "PROCESSING" | "DELIVERED" | "FAILED"> {
    try {
      const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(supplierOrderRef)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return "PENDING";
      const payload = await res.json();
      const order = payload.data?.order || payload.order;
      
      if (order.status === "completed" || order.status === "success" || order.status === "delivered") return "DELIVERED";
      if (order.status === "failed") return "FAILED";
      return "PROCESSING";
    } catch (e) {
      console.error("getOrderStatus failed:", e);
      return "PROCESSING";
    }
  }

  private async handleHttpError(res: Response) {
    let errPayload: any = {};
    try {
      errPayload = await res.json();
    } catch (_) {}
    const code = errPayload.code || "";
    const msg = errPayload.message || "";

    if (res.status === 401) {
      console.error(`[CRITICAL] Admin alert: API Key Authentication Error: ${code} - ${msg}`);
      throw new Error("Configuration Error: Supplier Authentication Failed.");
    }
    if (res.status === 403) {
      console.error(`[CRITICAL] Admin alert: Forbidden Error: ${code} - ${msg}`);
      throw new Error("Configuration Error: Supplier Access Denied.");
    }
    if (res.status === 410) {
      console.error(`[CRITICAL] Admin alert: Store deleted: ${code} - ${msg}`);
      throw new Error("Configuration Error: Supplier Store Deleted.");
    }
    throw new Error(msg || `HTTP Error ${res.status}`);
  }

  private async handleErrorPayload(status: number, payload: any, idempotencyKey: string) {
    const code = payload.code || "";
    const message = payload.message || "Unknown supplier error";

    if (status === 401) {
      console.error(`[CRITICAL] Admin alert: API Key Authentication error: ${code}`);
      throw new Error("Supplier Authentication Failed");
    }
    if (status === 403) {
      console.error(`[CRITICAL] Admin alert: Supplier authorization failure: ${code}`);
      throw new Error("Supplier Authorization Failed");
    }
    if (status === 410) {
      console.error(`[CRITICAL] Admin alert: Supplier store deleted: ${code}`);
      throw new Error("Supplier Store Deleted");
    }
    if (status === 400 && (code === "INVALID_PHONE" || code === "PHONE_NETWORK_MISMATCH")) {
      throw new Error("Please check the phone number and try again");
    }
    if (status === 400 && code === "BUNDLE_NOT_OFFERED") {
      this.getCatalog().catch(e => console.error("Error refreshing catalog: ", e));
      throw new Error("This bundle is temporarily unavailable");
    }
    if (status === 402 || code === "INSUFFICIENT_BALANCE") {
      console.error("[CRITICAL] Admin alert: DataMart deposit wallet needs topping up.");
      await db.order.update({
        where: { id: idempotencyKey },
        data: { status: "FAILED" },
      });
      throw new Error("This item is temporarily unavailable, please try again shortly");
    }
    if (status === 409 || code === "DUPLICATE_PENDING") {
      const existingOrder = await db.order.findUnique({
        where: { id: idempotencyKey },
      });
      if (existingOrder && existingOrder.supplierOrderRef) {
        return {
          supplierOrderRef: existingOrder.supplierOrderRef,
          status: existingOrder.status,
        };
      }
      throw new Error("Duplicate request processing");
    }
    if (status === 429) {
      const retryAfter = parseInt(payload.retryAfter || "5");
      console.warn(`[WARN] Rate limit hit. Backing off for ${retryAfter} seconds.`);
      await this.updateAccountLimits(0, { limit: 60, remaining: 0, resetInSeconds: retryAfter });
      throw new Error("Supplier is busy. Please try again shortly");
    }

    throw new Error(message);
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
