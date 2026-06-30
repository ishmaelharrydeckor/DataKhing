import { SITE_CONFIG } from "./site-config";

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
    // Return hard-coded realistic catalog matching what we seeded in the DB
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
    
    // Simulate deliberate failed order for specific test phone ending in 999
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
    // In mock mode, we want a progression:
    // We can use a simple time-based heuristic based on the order reference suffix or random odds.
    // E.g., 20% PENDING, 30% PROCESSING, 50% DELIVERED.
    // Or we can query the DB. But to keep the mock client self-contained, we can simulate based on timestamp/randomness.
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
    this.baseUrl = process.env.SUPPLIER_API_BASE_URL || "";
  }

  async getCatalog(): Promise<SupplierBundle[]> {
    // TODO: Wire up actual HTTP call to supplier API
    console.log("RealSupplierClient.getCatalog called");
    return [];
  }

  async placeOrder(
    bundleId: string,
    recipientPhone: string,
    idempotencyKey: string
  ): Promise<SupplierOrderResult> {
    // TODO: Wire up actual HTTP request with auth headers and body parameters
    console.log("RealSupplierClient.placeOrder called", { bundleId, recipientPhone, idempotencyKey });
    return {
      supplierOrderRef: `SUP-REAL-TODO`,
      status: "PENDING",
    };
  }

  async getOrderStatus(supplierOrderRef: string): Promise<"PENDING" | "PROCESSING" | "DELIVERED" | "FAILED"> {
    // TODO: Wire up actual HTTP status check
    console.log("RealSupplierClient.getOrderStatus called", supplierOrderRef);
    return "PENDING";
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
