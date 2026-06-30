"use client";

import { useState } from "react";
import { manageAgentApplicationAction } from "@/app/actions/admin";
import { Check, X, ShieldCheck, Clock } from "lucide-react";

interface Application {
  id: string;
  userId: string;
  status: string;
  businessName: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
}

export default function AdminAgentAppsClient({ initialApps }: { initialApps: Application[] }) {
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (appId: string, status: "APPROVED" | "REJECTED") => {
    setLoadingId(appId);
    const res = await manageAgentApplicationAction(appId, status);
    setLoadingId(null);

    if (res.success) {
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
    } else {
      alert(res.error || "Failed to update application status.");
    }
  };

  const pendingApps = apps.filter((a) => a.status === "PENDING");
  const processedApps = apps.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-8">
      {/* Pending Applications list */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-white mb-6">Pending Reseller Applications ({pendingApps.length})</h3>

        <div className="space-y-4">
          {pendingApps.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-2xl bg-slate-950 border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Business Name</span>
                <span className="font-bold text-white text-base block">{app.businessName || "No Business Name"}</span>
                
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-400">
                  <p>Applicant: <span className="text-white font-medium">{app.user.name || "Anon"}</span></p>
                  <p>Email: <span className="text-white font-medium font-mono">{app.user.email}</span></p>
                  <p>Phone: <span className="text-white font-medium font-mono">{app.user.phone || "—"}</span></p>
                </div>
              </div>

              <div className="flex gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => handleAction(app.id, "APPROVED")}
                  disabled={loadingId !== null}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Approve Agent
                </button>
                <button
                  onClick={() => handleAction(app.id, "REJECTED")}
                  disabled={loadingId !== null}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-705 disabled:opacity-50 text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-950/20"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
          {pendingApps.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No pending reseller agent applications.
            </div>
          )}
        </div>
      </div>

      {/* Application Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden">
        <h3 className="font-bold text-white mb-6">Application History Archive</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                <th className="pb-3">Applicant Name</th>
                <th className="pb-3">Business name</th>
                <th className="pb-3">Email Address</th>
                <th className="pb-3">Submitted On</th>
                <th className="pb-3 text-right">Archived Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {processedApps.map((app) => (
                <tr key={app.id} className="text-slate-350 hover:text-white transition">
                  <td className="py-3 font-bold text-white">{app.user.name || "Anon"}</td>
                  <td className="py-3 font-semibold">{app.businessName || "—"}</td>
                  <td className="py-3 font-mono text-[10px] text-slate-500">{app.user.email}</td>
                  <td className="py-3 text-[10px] text-slate-500">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    {app.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        <ShieldCheck className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                        <X className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {processedApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No historical logs in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
