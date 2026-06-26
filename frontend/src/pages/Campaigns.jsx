import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "../api/client";
import {
  Plus, Eye, Users, Scissors, ChevronRight, Pause, Play,
  Trash2, X, DollarSign, AlertTriangle, Clock, Globe,
} from "lucide-react";
import { format } from "date-fns";

function fv(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATUS_CHIP = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  ended:  "bg-gray-100 text-gray-500",
};

const PLATFORM_CHIP = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
  twitter:   "bg-sky-500 text-white",
};

const TYPE_LABEL = { clipping: "Clipping", ugc: "UGC", other: "Other" };

function NewCampaignModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", content_type: "clipping", category: "",
    description: "", guidelines: "", tutorial_video_url: "",
    budget: "", reward_per_1k_views: "", flat_fee: "",
    min_payout: "", max_payout_per_submission: "",
    allowed_platforms: ["tiktok", "instagram", "youtube"],
    start_date: "", end_date: "", auto_approve_hours: "48",
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const togglePlatform = (p) => setForm(f => ({
    ...f,
    allowed_platforms: f.allowed_platforms.includes(p)
      ? f.allowed_platforms.filter(x => x !== p)
      : [...f.allowed_platforms, p],
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      ...form,
      budget:                  parseFloat(form.budget) || 0,
      reward_per_1k_views:     parseFloat(form.reward_per_1k_views) || 0,
      flat_fee:                parseFloat(form.flat_fee) || 0,
      min_payout:              parseFloat(form.min_payout) || 0,
      max_payout_per_submission: parseFloat(form.max_payout_per_submission) || 0,
      auto_approve_hours:      parseInt(form.auto_approve_hours) || 48,
      start_date:              form.start_date || null,
      end_date:                form.end_date || null,
    });
  };

  const inputCls = "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Campaign</h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Campaign Title *</label>
                  <input required value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Viral TikTok Clipping Drive" />
                </div>
                <div>
                  <label className={labelCls}>Content Type</label>
                  <select value={form.content_type} onChange={set("content_type")} className={inputCls}>
                    <option value="clipping">Clipping</option>
                    <option value="ugc">UGC</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category / Niche</label>
                  <input value={form.category} onChange={set("category")} className={inputCls} placeholder="e.g. Finance, Fitness, Gaming" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls} placeholder="Brief summary for clippers" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Detailed Guidelines</label>
                  <textarea value={form.guidelines} onChange={set("guidelines")} rows={3} className={inputCls} placeholder="What clippers need to do, what content to post, what to avoid..." />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Tutorial Video URL (optional)</label>
                  <input value={form.tutorial_video_url} onChange={set("tutorial_video_url")} className={inputCls} placeholder="https://youtube.com/..." />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)} className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                  Next: Budget & Platforms →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                <strong>Note:</strong> Total budget, reward rate, and flat fee cannot be changed after the first submission.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Total Budget ($) *</label>
                  <input required type="number" step="0.01" min="0" value={form.budget} onChange={set("budget")} className={inputCls} placeholder="500.00" />
                </div>
                <div>
                  <label className={labelCls}>Reward Rate ($ / 1K Views) *</label>
                  <input required type="number" step="0.01" min="0" value={form.reward_per_1k_views} onChange={set("reward_per_1k_views")} className={inputCls} placeholder="3.00" />
                </div>
                <div>
                  <label className={labelCls}>Flat Fee Per Submission ($)</label>
                  <input type="number" step="0.01" min="0" value={form.flat_fee} onChange={set("flat_fee")} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Min Payout Threshold ($)</label>
                  <input type="number" step="0.01" min="0" value={form.min_payout} onChange={set("min_payout")} className={inputCls} placeholder="0.50" />
                  <p className="text-xs text-gray-400 mt-0.5">Submissions earning less than this won't count</p>
                </div>
                <div>
                  <label className={labelCls}>Max Payout Per Submission ($)</label>
                  <input type="number" step="0.01" min="0" value={form.max_payout_per_submission} onChange={set("max_payout_per_submission")} className={inputCls} placeholder="0 = no cap" />
                </div>
                <div>
                  <label className={labelCls}>Auto-Approve After (hours)</label>
                  <input type="number" min="0" value={form.auto_approve_hours} onChange={set("auto_approve_hours")} className={inputCls} placeholder="48" />
                  <p className="text-xs text-gray-400 mt-0.5">0 = manual only</p>
                </div>
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="date" value={form.end_date} onChange={set("end_date")} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Allowed Platforms</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[["tiktok","TikTok"], ["instagram","Instagram"], ["youtube","YouTube"], ["twitter","X / Twitter"]].map(([p, label]) => (
                    <button
                      key={p} type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.allowed_platforms.includes(p)
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                  ← Back
                </button>
                <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">
                  Launch Campaign
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
    refetchInterval: 60000,
  });

  const createMut   = useMutation({ mutationFn: createCampaign, onSuccess: () => { qc.invalidateQueries(["campaigns"]); setShowModal(false); } });
  const toggleMut   = useMutation({ mutationFn: ({ id, status }) => updateCampaign(id, { status }), onSuccess: () => qc.invalidateQueries(["campaigns"]) });
  const deleteMut   = useMutation({ mutationFn: deleteCampaign, onSuccess: () => qc.invalidateQueries(["campaigns"]) });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  const activeCampaigns   = campaigns.filter(c => c.status === "active").length;
  const totalBudget       = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent        = campaigns.reduce((s, c) => s + c.budget_spent, 0);
  const totalPending      = campaigns.reduce((s, c) => s + c.pending_count, 0);

  return (
    <div className="p-8 space-y-8">
      {showModal && (
        <NewCampaignModal
          onClose={() => setShowModal(false)}
          onCreate={(data) => createMut.mutate(data)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Rewards</h1>
          <p className="text-gray-500 text-sm mt-1">Pay clippers for organic views on your content</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/discover")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Globe className="w-4 h-4" /> Discover Portal
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Campaigns", value: activeCampaigns,          icon: Scissors,      color: "bg-brand-500" },
          { label: "Total Budget",     value: `$${totalBudget.toFixed(0)}`, icon: DollarSign, color: "bg-green-500" },
          { label: "Total Paid Out",   value: `$${totalSpent.toFixed(2)}`,  icon: DollarSign, color: "bg-blue-500" },
          { label: "Pending Review",   value: totalPending,             icon: Clock,         color: totalPending > 0 ? "bg-yellow-500" : "bg-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Scissors className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-gray-500">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first content rewards campaign</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const platforms = (() => { try { return JSON.parse(c.allowed_platforms); } catch { return []; } })();
            const budgetPct = c.budget > 0 ? Math.min(100, (c.budget_spent / c.budget) * 100) : 0;

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {/* Main row */}
                <div className="p-5 cursor-pointer" onClick={() => navigate(`/campaigns/${c.id}`)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CHIP[c.status]}`}>{c.status}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{TYPE_LABEL[c.content_type] || c.content_type}</span>
                        {c.category && <span className="text-xs text-gray-400">{c.category}</span>}
                        {platforms.map(p => (
                          <span key={p} className={`text-xs px-1.5 py-0.5 rounded font-bold ${PLATFORM_CHIP[p] || "bg-gray-200 text-gray-700"}`}>
                            {p === "twitter" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{c.name}</h3>
                      {c.description && <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{c.description}</p>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-5 mt-4 text-sm flex-wrap">
                    <div>
                      <span className="text-gray-400">CPM </span>
                      <span className="font-semibold text-gray-900">${c.reward_per_1k_views}/1K</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Views </span>
                      <span className="font-semibold text-gray-900">{fv(c.total_views)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Clippers </span>
                      <span className="font-semibold text-gray-900">{c.clipper_count}</span>
                    </div>
                    {c.pending_count > 0 && (
                      <span className="flex items-center gap-1 text-yellow-600 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {c.pending_count} pending
                      </span>
                    )}
                    {c.flagged_count > 0 && (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {c.flagged_count} flagged
                      </span>
                    )}
                    {c.end_date && (
                      <span className="text-gray-400 text-xs ml-auto">
                        Ends {format(new Date(c.end_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  {/* Budget bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>${c.budget_spent.toFixed(2)} spent</span>
                      <span>${c.budget_remaining.toFixed(2)} remaining of ${c.budget.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleMut.mutate({ id: c.id, status: c.status === "active" ? "paused" : "active" })}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
                    {c.status === "active" ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMut.mutate(c.id); }}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <span className="ml-auto text-xs text-gray-400">
                    Token: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{c.submission_token?.slice(0, 8)}…</code>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
