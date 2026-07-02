"use client";

import { useState } from "react";
import { updateStoreBrandingAction } from "@/app/actions/store";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface Store {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  supportEmail: string | null;
  contactPhone: string | null;
  footerText: string | null;
}

export default function BrandingForm({ store }: { store: Store }) {
  const [displayName, setDisplayName] = useState(store.displayName || "");
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor ?? "#4f46e5");
  const [supportEmail, setSupportEmail] = useState(store.supportEmail ?? "");
  const [contactPhone, setContactPhone] = useState(store.contactPhone ?? "");
  const [footerText, setFooterText] = useState(store.footerText ?? "");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateStoreBrandingAction(store.id, {
      displayName,
      logoUrl: logoUrl || undefined,
      primaryColor: primaryColor || undefined,
      supportEmail: supportEmail || undefined,
      contactPhone: contactPhone || undefined,
      footerText: footerText || undefined,
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: "Branding settings saved successfully!" });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update branding settings." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      {message && (
        <div
          className={`p-4 rounded-xl flex gap-2 items-center text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/25 text-rose-400"
          }`}
        >
          {message.type === "success" ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Store Display Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Store Slug (URL Path)
          </label>
          <input
            type="text"
            disabled
            value={`/shop/${store.slug}`}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Logo URL Path
          </label>
          <input
            type="text"
            placeholder="e.g. /images/my-logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Brand Color Hex
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer overflow-hidden p-0"
            />
            <input
              type="text"
              required
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Reseller Support Email
          </label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Support Contact Phone
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Footer Text
          </label>
          <textarea
            rows={2}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs transition text-white resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shrink-0 cursor-pointer"
      >
        {loading ? "Saving settings..." : "Save Branding Changes"}
      </button>
    </form>
  );
}
