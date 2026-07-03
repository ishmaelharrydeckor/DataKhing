import { db } from "@/lib/db";
import BuyWidget from "@/components/BuyWidget";
import { SITE_CONFIG } from "@/lib/site-config";
import { Zap, ShieldCheck, HeartHandshake, Star } from "lucide-react";
import Link from "next/link";

// Disable server cache so bundle list updates immediately on admin price changes
export const revalidate = 0;

export default async function LandingPage() {
  // Fetch active bundles from DB
  const bundles = await db.bundle.findMany({
    where: { active: true },
    orderBy: { dataAmountGB: "asc" },
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            Premium Data Reseller
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mt-6 tracking-tight max-w-3xl mx-auto leading-tight">
            Cheap Mobile Data Bundles,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent animate-gradient">
              Delivered Instantly
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mt-4 max-w-xl mx-auto font-medium">
            Save up to 40% on MTN, Telecel, and AirtelTigo bundles. No registration required to purchase. Safe, reliable, and instant.
          </p>
        </div>
      </section>

      {/* Main Buy Widget Section */}
      <section className="pb-24 px-4 relative z-10 bg-slate-950">
        <BuyWidget initialBundles={bundles} />
      </section>

      {/* Hero-like Promo Area for Become-a-Reseller */}
      <section className="py-16 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-white">Start Your Own Mobile Data Business</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            Partner with {SITE_CONFIG.SITE_NAME} today! Apply for a reseller storefront, configure your own custom markup tiers, and keep 100% of the margins.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/agent/apply"
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
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
              <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 h-fit">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Instant Fulfillment</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Our direct supplier connection processes your order immediately. Data is sent to your line in less than 60 seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 h-fit">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Secure Payments</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Processed via Paystack checkout. Your Mobile Money pins and cards are verified securely without ever touching our servers.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 h-fit">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Reseller Program</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Apply to become an agent to get lower cost per gigabyte, sell to customers at customized markups, and earn commission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Loved by thousands of users in Ghana
          </h2>
          <p className="text-slate-500 text-sm mt-2">See what our customers have to say about {SITE_CONFIG.SITE_NAME}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 text-left">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850">
              <div className="flex gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic">
                &quot;DataKhing has completely changed how I buy MTN bundles. It takes less than a minute and is so much cheaper than dialling shortcodes.&quot;
              </p>
              <div className="mt-4 text-xs font-semibold text-white">— Kwabena A., Accra</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850">
              <div className="flex gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic">
                &quot;I am an agent here and the commission model is awesome. I sell to my university colleagues and make good money weekly.&quot;
              </p>
              <div className="mt-4 text-xs font-semibold text-white">— Ama O., Kumasi</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850">
              <div className="flex gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic">
                &quot;Smooth interface and excellent customer support. Highly recommended for anyone looking to save on internet cost!&quot;
              </p>
              <div className="mt-4 text-xs font-semibold text-white">— Derrick T., Tema</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
