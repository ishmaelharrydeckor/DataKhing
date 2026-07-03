"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { SITE_CONFIG, formatPesewas } from "@/lib/site-config";
import { User, Wallet, LogOut, LayoutDashboard, Settings, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const params = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storeBranding, setStoreBranding] = useState<{ displayName: string; primaryColor: string } | null>(null);

  const walletBalance = (session?.user as any)?.walletBalance ?? 0;
  const role = (session?.user as any)?.role || "CUSTOMER";

  const storeSlug = params?.storeSlug as string | undefined;

  // Dynamically resolve store name if on a sub-agent route to prevent white-label leaks in navigation header
  useEffect(() => {
    if (storeSlug) {
      fetch(`/api/store-info?slug=${storeSlug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            setStoreBranding({
              displayName: data.displayName || data.name,
              primaryColor: data.primaryColor || "#4f46e5",
            });
          }
        })
        .catch(() => {});
    } else {
      setStoreBranding(null);
    }
  }, [storeSlug]);

  const brandName = storeBranding ? storeBranding.displayName : SITE_CONFIG.SITE_NAME;
  const brandColor = storeBranding ? storeBranding.primaryColor : "#4f46e5";
  const homePath = storeSlug ? `/shop/${storeSlug}` : "/";
  const becomeResellerPath = storeSlug ? `/shop/${storeSlug}/become-a-reseller` : "/agent/apply";

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Name */}
          <Link href={homePath} className="flex items-center gap-2 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg transition-transform group-hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              {brandName.charAt(0).toUpperCase()}
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              {brandName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href={homePath} className="text-slate-300 hover:text-white transition-colors">
              Buy Data
            </Link>
            
            <Link href={becomeResellerPath} className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold">
              Become a Reseller
            </Link>

            {session && (
              <>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {role === "ADMIN" && (
                  <Link href="/admin" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold">
                    <Settings className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                {role === "AGENT" && (
                  <Link href="/agent/dashboard" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold">
                    Agent Portal
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Auth & Wallet Actions */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard/wallet"
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">Balance:</span>
                  <span className="text-sm font-bold text-white">{formatPesewas(walletBalance)}</span>
                </Link>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: homePath })}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700/80 transition cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="text-sm font-semibold hover:text-white transition text-slate-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {session && (
              <Link
                href="/dashboard/wallet"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                {formatPesewas(walletBalance)}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3">
          <Link
            href={homePath}
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-300 hover:text-white text-sm"
          >
            Buy Data
          </Link>
          <Link
            href={becomeResellerPath}
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold animate-pulse"
          >
            Become a Reseller
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-300 hover:text-white text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-300 hover:text-white text-sm"
              >
                My Wallet
              </Link>
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-amber-400 hover:text-amber-300 text-sm font-semibold"
                >
                  Admin Panel
                </Link>
              )}
              {role === "AGENT" && (
                <Link
                  href="/agent/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
                >
                  Agent Portal
                </Link>
              )}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs text-slate-400">
                <span className="truncate">{session.user?.name || session.user?.email}</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: homePath });
                  }}
                  className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-rose-950/20 text-rose-400 border border-rose-900/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <Link
                href="/auth/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
