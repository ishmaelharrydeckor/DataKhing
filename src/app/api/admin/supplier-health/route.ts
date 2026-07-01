import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSupplierClient } from "@/lib/supplier";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return new Response("Unauthorized", { status: 401 });
    }

    const supplierClient = getSupplierClient();
    let connectionOk = false;
    let errorMsg = "";

    try {
      // Test connectivity by querying the supplier catalog
      await supplierClient.getCatalog();
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
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
