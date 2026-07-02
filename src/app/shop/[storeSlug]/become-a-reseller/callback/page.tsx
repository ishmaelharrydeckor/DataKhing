import { db } from "@/lib/db";
import { getPaymentClient } from "@/lib/payment";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function BecomeResellerCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ trxref?: string; reference?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const storeSlug = resolvedParams.storeSlug;
  const reference = resolvedSearchParams.reference || resolvedSearchParams.trxref;

  if (!reference) {
    redirect(`/shop/${storeSlug}`);
  }

  const paymentClient = getPaymentClient();
  const verifyResult = await paymentClient.verifyTransaction(reference);

  let success = false;
  if (verifyResult.success) {
    // Locate the pending application matching reference
    const app = await db.agentApplication.findFirst({
      where: { paymentRef: reference },
    });

    if (app && app.status === "PENDING_PAYMENT") {
      await db.agentApplication.update({
        where: { id: app.id },
        data: { status: "PENDING_REVIEW" },
      });
      success = true;
    } else if (app) {
      success = true; // Already processed
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100 min-h-screen">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {success ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-white">Payment Successful</h1>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Your application fee has been paid successfully. The store managers will review your profile shortly.
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Payment Verification Failed</h1>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              We couldn&apos;t verify your application payment. If money was deducted, please contact support.
            </p>
          </>
        )}
        <Link
          href={`/shop/${storeSlug}`}
          className="mt-6 inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Store
        </Link>
      </div>
    </div>
  );
}
