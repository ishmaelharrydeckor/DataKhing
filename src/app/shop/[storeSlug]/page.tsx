import { db } from "@/lib/db";
import BuyWidget from "@/components/BuyWidget";
import { notFound } from "next/navigation";
import { Zap, ShieldCheck, HeartHandshake, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 0;

interface Props {
  params: Promise<{ storeSlug: string }>;
}

// Generate dynamic store-specific tab header title and tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const store = await db.store.findUnique({
    where: { slug: resolvedParams.storeSlug },
  });
  
  if (!store) return {};
  
  const displayName = store.displayName || store.name;
  return {
    title: `${displayName} | Premium Mobile Data Bundles`,
    description: `Purchase instant cheap MTN, Telecel, and AirtelTigo bundles directly via ${displayName}.`,
  };
}

export default async function ShopFrontPage({ params }: Props) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.storeSlug;

  // 1. Fetch Store details
  const store = await db.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

  // 2. Fetch Pricing grid for this store
  const pricing = await db.storePricing.findMany({
    where: { storeId: store.id },
    include: { bundle: true },
  });

  // Map bundles list dynamically to match standard structure with custom prices
  const customizedBundles = pricing
    .filter((p) => p.bundle.active)
    .map((p) => ({
      id: p.bundle.id,
      network: p.bundle.network,
      label: p.bundle.label,
      dataAmountGB: p.bundle.dataAmountGB,
      sellPricePesewas: p.priceForCustomersPesewas,
      agentPricePesewas: p.priceForSubAgentsPesewas,
      supplierCostPesewas: p.bundle.supplierCostPesewas,
    }))
    .sort((a, b) => a.dataAmountGB - b.dataAmountGB);

  // Fallback to default bundles if no custom pricing is stored yet
  let bundlesToUse = customizedBundles;
  if (bundlesToUse.length === 0) {
    const rawBundles = await db.bundle.findMany({
      where: { active: true },
      orderBy: { dataAmountGB: "asc" },
    });
    bundlesToUse = rawBundles.map((b) => ({
      id: b.id,
      network: b.network,
      label: b.label,
      dataAmountGB: b.dataAmountGB,
      sellPricePesewas: b.sellPricePesewas,
      agentPricePesewas: b.agentPricePesewas,
      supplierCostPesewas: b.supplierCostPesewas,
    }));
  }

  // Branding variables
  const displayName = store.displayName || store.name;
  const primaryColor = store.primaryColor || "#4f46e5"; // Indigo
  const logoUrl = store.logoUrl;
  const footerText = store.footerText || `© 2026 ${displayName}. Powered by secure billing partners.`;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      {/* Dynamic Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-extrabold text-lg text-white tracking-tight">{displayName}</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/shop/${storeSlug}/become-a-reseller`}
            className="text-xs font-bold text-slate-400 hover:text-white transition"
          >
            Become a Reseller
          </Link>
          <Link
            href="/auth/signin"
            className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-slate-950 text-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}10` }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span
            className="px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider"
            style={{ color: primaryColor, borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}08` }}
          >
            Authorized Reseller
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mt-6 tracking-tight max-w-3xl mx-auto leading-tight">
            Cheap Mobile Data Bundles, Delivered Instantly
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mt-4 max-w-xl mx-auto font-medium">
            Save on MTN, Telecel, and AirtelTigo bundles. Safe, reliable, and instant.
          </p>
        </div>
      </section>

      {/* Main Buy Widget Section */}
      <section className="pb-24 px-4 relative z-10 bg-slate-950">
        {/* We pass a custom storeSlug parameter to indicate pricing mapping on order placements */}
        <BuyWidget initialBundles={bundlesToUse} />
      </section>

      {/* Hero-like Promo Area for Become-a-Reseller */}
      <section className="py-16 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-white">Start Your Own Mobile Data Business</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            Partner with {displayName} today! Apply for a reseller sub-store, configure your own price markup tiers, and keep 100% of the margins.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={`/shop/${storeSlug}/become-a-reseller`}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              Become a Reseller
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-2xl text-sm transition"
            >
              Customer Signup
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-slate-900/50 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 h-fit" style={{ color: primaryColor }}>
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Instant Fulfillment</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Our systems process your order immediately. Data is sent to your line in less than 60 seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 h-fit" style={{ color: primaryColor }}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Secure Payments</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Processed securely. PIN and card details are encrypted by Paystack checkout.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 h-fit" style={{ color: primaryColor }}>
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Reseller Program</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Apply to become an agent to get lower cost per gigabyte and customize pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 px-4 text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-xs">{footerText}</span>
          <div className="flex gap-6 text-xs text-slate-450">
            {store.supportEmail && <span>Email: {store.supportEmail}</span>}
            {store.contactPhone && <span>Support: {store.contactPhone}</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
