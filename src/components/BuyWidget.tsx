"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getNetworkFromPhone, validatePhoneNumber, formatPesewas, NetworkType, SITE_CONFIG } from "@/lib/site-config";
import { createOrderAction } from "@/app/actions/orders";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Mail, Award, CreditCard, Wallet, CheckCircle, HelpCircle, Smartphone } from "lucide-react";

interface Bundle {
  id: string;
  network: string;
  label: string;
  dataAmountGB: number;
  sellPricePesewas: number;
  agentPricePesewas: number;
  supplierCostPesewas: number;
}

export default function BuyWidget({ initialBundles }: { initialBundles: Bundle[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipientPhone, setRecipientPhone] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("MTN");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [referrerCode, setReferrerCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PAYSTACK" | "WALLET">("PAYSTACK");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const role = (session?.user as any)?.role || "CUSTOMER";
  const walletBalance = (session?.user as any)?.walletBalance ?? 0;

  // Auto-fill referrer code if set in URL query (e.g. ?ref=AGENTREF)
  useEffect(() => {
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      setReferrerCode(urlRef);
      // Also cache it
      localStorage.setItem("datahub_referrer", urlRef);
    } else {
      const cached = localStorage.getItem("datahub_referrer");
      if (cached) setReferrerCode(cached);
    }
  }, [searchParams]);

  // Auto-detect network based on input phone number prefix
  useEffect(() => {
    if (recipientPhone.length >= 3) {
      const detected = getNetworkFromPhone(recipientPhone);
      if (detected) {
        setSelectedNetwork(detected);
      }
    }
  }, [recipientPhone]);

  // Filter bundles based on network selected
  const filteredBundles = initialBundles.filter((b) => b.network === selectedNetwork);

  // Automatically select the first bundle of the filtered list when network changes
  useEffect(() => {
    if (filteredBundles.length > 0) {
      setSelectedBundleId(filteredBundles[0].id);
    } else {
      setSelectedBundleId("");
    }
  }, [selectedNetwork, initialBundles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 1. Phone validation
    if (!validatePhoneNumber(recipientPhone, selectedNetwork)) {
      setMessage({
        type: "error",
        text: `Please enter a valid 10-digit Ghanaian ${selectedNetwork} number (e.g. starting with 024, 054, etc.)`,
      });
      return;
    }

    // 2. Guest Email validation
    if (!session && !guestEmail) {
      setMessage({ type: "error", text: "Please enter your email to receive order confirmations." });
      return;
    }

    // 3. Bundle select check
    if (!selectedBundleId) {
      setMessage({ type: "error", text: "Please choose a data bundle." });
      return;
    }

    setLoading(true);

    const res = await createOrderAction({
      bundleId: selectedBundleId,
      recipientPhone,
      paymentMethod,
      guestEmail: session ? undefined : guestEmail,
      referrerCode: referrerCode || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (res.checkoutUrl) {
        // Redirect to mock/real checkout gateway
        router.push(res.checkoutUrl);
      } else if (res.orderId) {
        // Paid via wallet, direct redirect to tracking page
        router.push(`/order/${res.orderId}`);
      }
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create order." });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
      
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Smartphone className="text-indigo-400" />
        Quick Bundle Purchase
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Network Selector */}
        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-3">
            1. Choose Mobile Network
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["MTN", "TELECEL", "AIRTELTIGO"] as NetworkType[]).map((net) => {
              const isActive = selectedNetwork === net;
              const colorMap = {
                MTN: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 active:border-amber-400",
                TELECEL: "border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 active:border-rose-400",
                AIRTELTIGO: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 active:border-cyan-400",
              };
              
              const activeColorMap = {
                MTN: "border-amber-400 bg-amber-500/20 text-amber-300",
                TELECEL: "border-rose-400 bg-rose-500/20 text-rose-300",
                AIRTELTIGO: "border-cyan-400 bg-cyan-500/20 text-cyan-300",
              };

              return (
                <button
                  type="button"
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  className={`py-3 px-2 rounded-2xl border text-center font-bold text-xs tracking-wider transition cursor-pointer ${
                    isActive ? activeColorMap[net] : colorMap[net]
                  }`}
                >
                  {net}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipient Phone */}
        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-2">
            2. Recipient Phone Number
          </label>
          <div className="relative">
            <Phone className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="e.g. 0241234567"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-white placeholder-slate-600 font-medium"
            />
            {recipientPhone.length >= 3 && (
              <span className={`absolute right-4 top-4 text-xs font-bold ${
                selectedNetwork === "MTN" ? "text-amber-400" :
                selectedNetwork === "TELECEL" ? "text-rose-400" : "text-cyan-400"
              }`}>
                {selectedNetwork}
              </span>
            )}
          </div>
        </div>

        {/* Bundle Selector */}
        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-3">
            3. Select Data Bundle Size
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredBundles.map((b) => {
              // Calculate custom markup based on role
              let price = b.sellPricePesewas;
              if (role === "AGENT") price = b.agentPricePesewas;
              else if (role === "ADMIN") price = b.supplierCostPesewas;

              const isSelected = selectedBundleId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBundleId(b.id)}
                  className={`flex justify-between items-center p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300"
                  }`}
                >
                  <div className="font-semibold text-sm">{b.label}</div>
                  <div className="flex items-center gap-2">
                    {role !== "CUSTOMER" && (
                      <span className="text-xs line-through text-slate-500">
                        {formatPesewas(b.sellPricePesewas)}
                      </span>
                    )}
                    <span className="font-extrabold text-sm text-indigo-400">
                      {formatPesewas(price)}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredBundles.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
                No active bundles found for {selectedNetwork}.
              </div>
            )}
          </div>
        </div>

        {/* Authenticated / Guest checks */}
        {!session && (
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">
              4. Email Address (For Order Receipts)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-white placeholder-slate-600 font-medium"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 pl-1">
              Want cashback and saved recipient shortcuts?{" "}
              <span className="text-indigo-400 hover:underline cursor-pointer" onClick={() => router.push("/auth/signup")}>
                Create an account
              </span>.
            </p>
          </div>
        )}

        {/* Referrer field (optional) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Referral Link / Code (Optional)
            </label>
          </div>
          <input
            type="text"
            placeholder="e.g. AGENTREF"
            value={referrerCode}
            onChange={(e) => setReferrerCode(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 transition text-white placeholder-slate-700 text-sm font-mono"
          />
        </div>

        {/* Payment Selection */}
        {session && (
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-3">
              5. Choose Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("PAYSTACK")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                  paymentMethod === "PAYSTACK"
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-400"
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-400" />
                Mobile Money
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("WALLET")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                  paymentMethod === "WALLET"
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-400"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                Pay with Wallet ({formatPesewas(walletBalance)})
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-2xl text-sm border font-medium ${
            message.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold rounded-2xl transition duration-250 cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Securing Checkout Connection...
            </>
          ) : (
            <>
              Proceed to Payment
            </>
          )}
        </button>
      </form>
    </div>
  );
}
