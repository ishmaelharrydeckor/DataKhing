import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_CONFIG } from "@/lib/site-config";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.SITE_NAME} | ${SITE_CONFIG.SITE_TAGLINE}`,
    template: `%s | ${SITE_CONFIG.SITE_NAME}`,
  },
  description: SITE_CONFIG.SITE_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          
          <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4">
              <p>© {new Date().getFullYear()} {SITE_CONFIG.SITE_NAME}. All rights reserved.</p>
              <p className="mt-1 text-slate-600">
                Contact support: {SITE_CONFIG.SUPPORT_EMAIL} | {SITE_CONFIG.SUPPORT_PHONE}
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
