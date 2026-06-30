"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function ReferralsCopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-indigo-600/25"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy Link
        </>
      )}
    </button>
  );
}
