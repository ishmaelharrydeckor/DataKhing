"use client";

import { useState } from "react";
import { approveAgentApplicationAction, rejectAgentApplicationAction } from "@/app/actions/store";
import { Check, X, Smartphone } from "lucide-react";
import { formatPesewas } from "@/lib/site-config";
import { useRouter } from "next/navigation";

export default function ApplicationsList({ applications }: { applications: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    const res = await approveAgentApplicationAction(id);
    setLoadingId(null);
    if (res.success) {
      alert(`Application approved! Custom storefront created at: /shop/${res.slug}`);
      router.refresh();
    } else {
      alert(res.error || "Failed to approve application.");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this applicant? This will process an immediate transaction refund if fees were paid.")) {
      return;
    }
    setLoadingId(id);
    const res = await rejectAgentApplicationAction(id);
    setLoadingId(null);
    if (res.success) {
      alert("Application rejected and fee refunded.");
      router.refresh();
    } else {
      alert(res.error || "Failed to reject application.");
    }
  };

  if (applications.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs italic">
        No pending reseller applications found.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
              <th className="p-4 sm:p-5">Applicant Name</th>
              <th className="p-4 sm:p-5">Requested Store</th>
              <th className="p-4 sm:p-5">Applied Date</th>
              <th className="p-4 sm:p-5">Fee Paid</th>
              <th className="p-4 sm:p-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {applications.map((app) => (
              <tr key={app.id} className="text-slate-300 hover:text-white transition">
                <td className="p-4 sm:p-5">
                  <div className="font-bold text-white text-sm">{app.applicantUser?.name || "Anonymous User"}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{app.applicantUser?.email}</div>
                </td>
                <td className="p-4 sm:p-5 text-slate-200 font-bold">{app.storeName}</td>
                <td className="p-4 sm:p-5 text-slate-400">
                  {new Date(app.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 sm:p-5 text-emerald-400 font-bold">
                  {formatPesewas(app.applicationFeePesewas)}
                </td>
                <td className="p-4 sm:p-5 text-right space-x-2 shrink-0">
                  <button
                    onClick={() => handleApprove(app.id)}
                    disabled={loadingId === app.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(app.id)}
                    disabled={loadingId === app.id}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
