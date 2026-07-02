"use client";

import { useState } from "react";
import { archiveWalletTransactionAction } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface ArchiveTransactionButtonProps {
  txId: string;
}

export default function ArchiveTransactionButton({ txId }: ArchiveTransactionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to clear this transaction from your history?")) {
      return;
    }
    setLoading(true);
    const res = await archiveWalletTransactionAction(txId);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to clear transaction.");
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition duration-150 cursor-pointer disabled:opacity-50 shrink-0"
      title="Clear transaction"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
