import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getClipperStatus } from "../api/client";
import { Search, Zap, CheckCircle, Clock, AlertTriangle, XCircle, DollarSign, Eye, ExternalLink } from "lucide-react";

const STATUS_CFG = {
  approved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Approved" },
  pending:  { icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50", label: "Pending" },
  flagged:  { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Flagged" },
  rejected: { icon: XCircle,    color: "text-gray-500", bg: "bg-gray-50", label: "Rejected" },
};

const PLATFORM_CHIP = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
  twitter:   "bg-sky-500 text-white",
};

function fv(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ClipperStatus() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => getClipperStatus(email.trim()),
    onSuccess: data => setResult(data),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setResult(null);
    mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-950 to-brand-700 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white/60 text-sm">ContentCred — Content Rewards</span>
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Check Your Submission Status</h1>
          <p className="text-brand-200 text-sm">Enter your email to view all your submissions and earnings.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Search form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isPending ? "Looking up..." : "Check Status"}
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-3">{error?.response?.data?.detail || "Lookup failed. Try again."}</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Summary for {result.email}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{result.submissions.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${result.total_earnings.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{result.campaigns.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Campaigns</div>
                </div>
              </div>
            </div>

            {/* Submissions list */}
            {result.submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No submissions found for this email</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Your Submissions</h3>
                </div>
                {result.submissions.map(sub => {
                  const cfg = STATUS_CFG[sub.approval_status] || STATUS_CFG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={sub.submission_id} className={`px-6 py-4 border-b border-gray-50 last:border-0 ${cfg.bg}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${PLATFORM_CHIP[sub.platform] || "bg-gray-200 text-gray-700"}`}>
                              {sub.platform}
                            </span>
                            <span className="text-xs text-gray-400">{sub.campaign_name}</span>
                          </div>
                          <a href={sub.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate max-w-sm">
                            {sub.title || sub.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fv(sub.current_views)}</span>
                            <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                            {sub.payout_status === "paid" && (
                              <span className="text-green-600 font-medium">Paid out</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                          </span>
                          {sub.approval_status === "approved" && (
                            <span className="flex items-center gap-0.5 text-sm font-bold text-green-600">
                              <DollarSign className="w-3.5 h-3.5" />{sub.earnings.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
