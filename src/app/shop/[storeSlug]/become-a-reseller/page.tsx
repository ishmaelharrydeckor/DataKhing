import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import BecomeResellerForm from "./BecomeResellerForm";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 0;

interface Props {
  params: Promise<{ storeSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const store = await db.store.findUnique({
    where: { slug: resolvedParams.storeSlug },
  });
  
  if (!store) return {};
  
  const displayName = store.displayName || store.name;
  return {
    title: `Become a Reseller under ${displayName} | Agent Application`,
    description: `Enroll to become a reseller agent under ${displayName} and manage your own custom mobile data bundle storefront.`,
  };
}

export default async function BecomeResellerPage({ params }: Props) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.storeSlug;

  const store = await db.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

  // Get pricing tier properties
  const displayName = store.displayName || store.name;
  const primaryColor = store.primaryColor || "#4f46e5";

  // Application fee is configurable per parent store, default to GH₵50.00 (5000 pesewas) for child subagents if not default
  const applicationFeePesewas = store.parentStoreId ? 5000 : 0; 

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100 min-h-screen">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl" style={{ backgroundColor: `${primaryColor}10` }} />
        
        <Link
          href={`/shop/${storeSlug}`}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-white text-xs mb-6 font-semibold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to store
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6" style={{ color: primaryColor }} />
            Reseller Agent Program
          </h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Become a partner under <span className="font-bold text-white">{displayName}</span>. Buy data at wholesale rates and sell under your own brand storefront.
          </p>

          <BecomeResellerForm parentStoreId={store.id} applicationFeePesewas={applicationFeePesewas} primaryColor={primaryColor} />
        </div>
      </div>
    </div>
  );
}
