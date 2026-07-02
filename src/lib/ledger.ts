import { db } from "./db";
import { getSupplierClient } from "./supplier";

interface PricingItem {
  priceForSubAgentsPesewas: number;
}

interface SimplifiedStore {
  parentStoreId: string | null;
  storePricing: PricingItem[];
}

/**
 * Automatically creates Ledger records for all stores in the parent chain
 * starting from the store where the order was placed up to the root store.
 */
export async function createCascadingLedgerEntries(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { bundle: true },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  // If no storeId is recorded, default to root or skip cascading
  let storeId = order.storeId;
  if (!storeId) {
    // Find the ROOT store if order is direct
    const rootStore = await db.store.findFirst({
      where: { storeType: "ROOT" },
    });
    if (!rootStore) {
      console.warn("No ROOT store found to attribute direct order to.");
      return;
    }
    storeId = rootStore.id;
  }

  // Fetch DataMart wholesale cost for this bundle
  let wholesaleCostPesewas = order.bundle.supplierCostPesewas;
  try {
    const supplierClient = getSupplierClient();
    const catalog = await supplierClient.getCatalog();
    const matched = catalog.find(
      (b) =>
        b.network === order.bundle.network &&
        Math.abs(b.dataAmountGB - order.bundle.dataAmountGB) < 0.01
    );
    if (matched) {
      wholesaleCostPesewas = matched.supplierCostPesewas;
    }
  } catch (err) {
    console.warn("Could not sync latest wholesale cost from supplier catalog. Using local bundle cost.", err);
  }

  // Loop upward from order store to root store
  let currentStoreId: string | null = storeId;
  let depth = 0;
  let nextPricePesewas = order.amountPaid; // Sell price for the lowest tier is customer paid price

  while (currentStoreId) {
    const currentStore: SimplifiedStore | null = await db.store.findUnique({
      where: { id: currentStoreId },
      select: {
        parentStoreId: true,
        storePricing: {
          where: { bundleId: order.bundleId },
          select: { priceForSubAgentsPesewas: true },
        },
      },
    });

    if (!currentStore) {
      console.error(`Store ${currentStoreId} in ancestor chain not found.`);
      break;
    }

    let buyPricePesewas = wholesaleCostPesewas;
    let sellPricePesewas = nextPricePesewas;

    if (currentStore.parentStoreId) {
      // Find what the parent charges this store (the sub-agent price)
      const parentPricing = await db.storePricing.findUnique({
        where: {
          storeId_bundleId: {
            storeId: currentStore.parentStoreId,
            bundleId: order.bundleId,
          },
        },
      });

      if (parentPricing) {
        buyPricePesewas = parentPricing.priceForSubAgentsPesewas;
      } else {
        // If parent hasn't set custom sub-agent pricing, default to parent's own buy-in price (which is parent's parent pricing, etc.)
        // We will default to order's local bundle cost or what parent paid upstream
        const parentStoreObj = await db.store.findUnique({
          where: { id: currentStore.parentStoreId },
          include: {
            storePricing: { where: { bundleId: order.bundleId } }
          }
        });
        buyPricePesewas = parentStoreObj?.storePricing?.[0]?.priceForSubAgentsPesewas ?? order.bundle.supplierCostPesewas;
      }
    } else {
      // Root store terminus: root's buyPrice is the wholesaleCost. Loop terminates after this.
      buyPricePesewas = wholesaleCostPesewas;
    }

    const marginPesewas = sellPricePesewas - buyPricePesewas;

    // Persist ledger row for this tier
    await db.ledger.create({
      data: {
        storeId: currentStoreId,
        orderId,
        tierDepth: depth,
        buyPricePesewas,
        sellPricePesewas,
        amountPesewas: marginPesewas,
        status: "AVAILABLE",
      },
    });

    // Setup values for parent loop
    nextPricePesewas = buyPricePesewas;
    currentStoreId = currentStore.parentStoreId; // Walk up to parent
    depth++;
  }
}
