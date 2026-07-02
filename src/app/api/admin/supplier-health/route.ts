import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKey = process.env.SUPPLIER_API_KEY || "";
    const baseUrl = process.env.SUPPLIER_API_BASE_URL || "https://api.datamartgh.shop/api/store/v1";

    let connectionOk = false;
    let errorMsg = "";
    let metrics = null;
    let isOpen = false;
    let storeStatus = "UNKNOWN";

    try {
      // 1. Fetch Store Profile
      const storeRes = await fetch(`${baseUrl}/store`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!storeRes.ok) {
        throw new Error(`Store status endpoint returned ${storeRes.status}`);
      }

      const storeData = await storeRes.json();
      const store = storeData.data?.store || storeData.store;
      if (store) {
        isOpen = store.isOpen;
        storeStatus = store.status;
        metrics = store.metrics || null;
      }

      // 2. Fetch Wallet Balance
      const balanceRes = await fetch(`${baseUrl}/wallet/balance`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        const deposit = balanceData.data?.deposit || balanceData.deposit;
        if (deposit && deposit.balance !== undefined) {
          const balancePesewas = Math.round(deposit.balance * 100);
          await db.supplierAccount.upsert({
            where: { id: "default" },
            create: {
              id: "default",
              balancePesewas,
              rateLimitRemaining: 60,
              rateLimitResetAt: new Date(),
            },
            update: {
              balancePesewas,
            },
          });
        }
      }

      connectionOk = true;
    } catch (e: any) {
      errorMsg = e.message || "Failed connection test";
    }

    // Retrieve cached account limits from DB
    const account = await db.supplierAccount.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json({
      success: true,
      health: {
        connection: connectionOk ? "OK" : "FAILED",
        error: errorMsg || null,
        balancePesewas: account?.balancePesewas ?? 0,
        rateLimitRemaining: account?.rateLimitRemaining ?? 0,
        rateLimitResetAt: account?.rateLimitResetAt ? new Date(account.rateLimitResetAt).toLocaleString() : null,
        updatedAt: account?.updatedAt ? new Date(account.updatedAt).toLocaleString() : null,
        isOpen,
        storeStatus,
        metrics,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
