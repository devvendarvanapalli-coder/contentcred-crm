import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaign, getClippers, addClipper, deleteClipper,
  getSubmissions, approveSubmission, rejectSubmission, flagSubmission,
  addClip, updateClipMetrics, deleteClip,
  getLeaderboard, getCampaignAnalysis, updateCampaign,
  topupBudget, getPayoutQueue, createPayout, getPayoutBatches,
  exportCsv, refreshAllViews,
} from "../api/client";
import {
  ArrowLeft, Plus, Eye, Trash2, ExternalLink, Users, DollarSign,
  TrendingUp, X, AlertTriangle, ShieldCheck, ShieldAlert, Activity,
  BarChart2, ThumbsUp, MessageCircle, Share2, RefreshCw, Check,
  Clock, Trophy, ChevronDown, ChevronUp, Copy, Download, CreditCard,
  Wallet, Zap,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────
function fv(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PLATFORM_CHIP = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
  twitter:   "bg-sky-500 text-white",
};
const PLATFORM_LABEL = { tiktok: "TikTok", instagram: "IG", youtube: "YT", twitter: "X" };

const BOT_CFG = {
  clean:      { color: "text-green-600 bg-green-50",   icon: ShieldCheck  },
  monitor:    { color: "text-blue-600 bg-blue-50",     icon: Activity     },
  suspicious: { color: "text-yellow-600 bg-yellow-50", icon: AlertTriangle },
  botted:     { color: "text-red-600 bg-red-50",       icon: ShieldAlert  },
};

const STATUS_ROW_BG = {
  pending:  "",
  approved: "bg-green-50/40",
  flagged:  "bg-red-50/40",
  rejected: "bg-gray-50",
};

// ── Approve confirmation ──────────────────────────────────────────
function ApproveDialog({ clip, onConfirm, onClose }) {
  const [skip, setSkip] = useState(false);
  const earnings = clip.earnings ?? 0;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Approve Submission</h2>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Approving this will count <strong>{fv(clip.current_views)} views</strong> and pay out{" "}
          <strong className="text-green-600">${earnings.toFixed(2)}</strong>.
        </p>
        <p className="text-xs text-gray-400 mb-5">This deducts from your campaign budget.</p>
        <label className="flex items-center gap-2 text-sm text-gray-500 mb-5 cursor-pointer">
          <input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} />
          Do not ask again for future approvals
        </label>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={() => onConfirm()} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Approve</button>
        </div>
      </div>
    </div>
  );
}

// ── Reject dialog ─────────────────────────────────────────────────
function RejectDialog({ clip, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [ban, setBan] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Reject Submission</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">Briefly explain why this submission is being rejected. The clipper will be notified.</p>
        <textarea
          required
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
          placeholder="e.g. Content doesn't follow campaign guidelines..."
        />
        <label className="flex items-center gap-2 text-sm text-red-600 mb-5 cursor-pointer">
          <input type="checkbox" checked={ban} onChange={e => setBan(e.target.checked)} className="accent-red-600" />
          Also ban this user for botting
        </label>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (!reason.trim()) return; onConfirm(reason, ban); }}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Metrics update dialog ─────────────────────────────────────────
function MetricsDialog({ clip, onSave, onClose }) {
  const [form, setForm] = useState({
    current_views: String(clip.current_views),
    likes: String(clip.likes), comments: String(clip.comments), shares: String(clip.shares),
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const er = parseInt(form.current_views) > 0
    ? (((parseInt(form.likes)||0)+(parseInt(form.comments)||0)+(parseInt(form.shares)||0)) / parseInt(form.current_views) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Update Metrics</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="text-xs text-gray-400 truncate mb-3">{clip.url}</div>
        <form onSubmit={e => { e.preventDefault(); onSave({ current_views: parseInt(form.current_views)||0, likes: parseInt(form.likes)||0, comments: parseInt(form.comments)||0, shares: parseInt(form.shares)||0 }); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views *</label>
            <input required type="number" min="0" value={form.current_views} onChange={set("current_views")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["likes","Likes"],["comments","Comments"],["shares","Shares"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-gray-400">{l}</label>
                <input type="number" min="0" value={form[k]} onChange={set(k)} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
            Engagement rate: <span className="font-semibold text-gray-800">{er}%</span>
            <span className="ml-1 text-gray-400">(bot detection re-runs on save)</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Save & Re-analyze</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Clipper modal ─────────────────────────────────────────────
function AddClipperModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:"", email:"", tiktok_handle:"", instagram_handle:"", youtube_handle:"", twitter_handle:"", notes:"" });
  const set = k => e => setForm(f => ({...f,[k]:e.target.value}));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Clipper</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd(form); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name *</label>
              <input required value={form.name} onChange={set("name")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={set("email")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="jane@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["tiktok_handle","TikTok"],["instagram_handle","Instagram"],["youtube_handle","YouTube"],["twitter_handle","X/Twitter"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-gray-400">{l}</label>
                <input value={form[k]} onChange={set(k)} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" placeholder="@handle" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Add Clipper</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Clip (for admin-added clippers) ──────────────────────────
function AddClipModal({ campaignId, clippers, onClose, onAdd }) {
  const [form, setForm] = useState({ clipper_id:"", url:"", platform:"tiktok", title:"", current_views:"", likes:"", comments:"", shares:"" });
  const set = k => e => setForm(f => ({...f,[k]:e.target.value}));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Submission</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd({ ...form, current_views: parseInt(form.current_views)||0, likes: parseInt(form.likes)||0, comments: parseInt(form.comments)||0, shares: parseInt(form.shares)||0 }); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clipper *</label>
            <select required value={form.clipper_id} onChange={set("clipper_id")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select clipper...</option>
              {clippers.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Post URL *</label>
            <input required value={form.url} onChange={set("url")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://www.tiktok.com/@..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</label>
              <select value={form.platform} onChange={set("platform")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">X/Twitter</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views</label>
              <input type="number" min="0" value={form.current_views} onChange={set("current_views")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["likes","Likes"],["comments","Comments"],["shares","Shares"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-gray-400">{l}</label>
                <input type="number" min="0" value={form[k]} onChange={set(k)} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title (optional)</label>
            <input value={form.title} onChange={set("title")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <p className="text-xs text-gray-400">Bot detection runs automatically on save.</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Submit & Analyze</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Submission row ────────────────────────────────────────────────
function SubmissionRow({ clip, campaignId, onApprove, onReject, onFlag, onUpdateMetrics, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const botCfg = BOT_CFG[clip.bot_flag] || BOT_CFG.clean;
  const BotIcon = botCfg.icon;
  const reasons = (() => { try { return JSON.parse(clip.bot_reasons || "[]"); } catch { return []; } })();
  const er = clip.current_views > 0
    ? (((clip.likes + clip.comments + clip.shares) / clip.current_views) * 100).toFixed(2)
    : "—";

  return (
    <div className={`border-b border-gray-100 last:border-0 ${STATUS_ROW_BG[clip.approval_status]}`}>
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Platform */}
        <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 ${PLATFORM_CHIP[clip.platform] || "bg-gray-200 text-gray-700"}`}>
          {PLATFORM_LABEL[clip.platform] || clip.platform}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-medium text-gray-900 text-sm">{clip.clipper_name || "Unknown"}</span>
                {clip.clipper_email && <span className="text-xs text-gray-400">{clip.clipper_email}</span>}
              </div>
              <a href={clip.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 max-w-md truncate">
                {clip.title || clip.url}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fv(clip.current_views)}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{fv(clip.likes)}</span>
            <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{fv(clip.comments)}</span>
            <span className="flex items-center gap-0.5"><Share2 className="w-3 h-3" />{fv(clip.shares)}</span>
            <span>ER: {er}%</span>
            {clip.approval_status === "approved" && (
              <span className="font-semibold text-green-600">+${clip.earnings?.toFixed(2)}</span>
            )}
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${botCfg.color}`}>
              <BotIcon className="w-3 h-3" /> {clip.bot_flag} ·{clip.bot_score}
            </span>
            <span className="text-gray-300">{formatDistanceToNow(new Date(clip.submitted_at), { addSuffix: true })}</span>
            {clip.auto_approve_at && clip.approval_status === "pending" && (
              <span className="text-yellow-600 flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> auto-approves {formatDistanceToNow(new Date(clip.auto_approve_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Rejection reason */}
          {clip.approval_status === "rejected" && clip.rejection_reason && (
            <div className="mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
              Rejection reason: {clip.rejection_reason}
            </div>
          )}

          {/* Expand bot reasons */}
          {reasons.length > 0 && (clip.bot_flag === "suspicious" || clip.bot_flag === "botted") && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              {expanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>} Bot signals
            </button>
          )}
          {expanded && (
            <ul className="mt-1 space-y-0.5">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{r}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {clip.approval_status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => onApprove(clip)}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => onReject(clip)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}
          {clip.approval_status === "flagged" && (
            <div className="flex gap-2">
              <button onClick={() => onApprove(clip)}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">Override & Approve</button>
              <button onClick={() => onReject(clip)}
                className="px-3 py-1.5 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50">Reject</button>
            </div>
          )}
          {clip.approval_status === "approved" && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
              <Check className="w-3.5 h-3.5" /> Approved
            </span>
          )}
          {clip.approval_status === "rejected" && (
            <span className="text-xs text-gray-400 font-medium">Rejected</span>
          )}
          <button onClick={() => onUpdateMetrics(clip)} className="text-xs text-gray-400 hover:text-brand-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Update views
          </button>
          <button onClick={() => { if (confirm("Delete this submission?")) onDelete(clip); }} className="text-gray-300 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submissions Tab ───────────────────────────────────────────────
function SubmissionsTab({ campaignId, campaign, clippers }) {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState("pending");
  const [approveClip, setApproveClip] = useState(null);
  const [rejectClip, setRejectClip] = useState(null);
  const [metricsClip, setMetricsClip] = useState(null);
  const [showAddClip, setShowAddClip] = useState(false);

  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", campaignId, subTab],
    queryFn: () => getSubmissions(campaignId, subTab),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    ["pending","approved","flagged","rejected"].forEach(s => qc.invalidateQueries(["submissions", campaignId, s]));
    qc.invalidateQueries(["campaign", campaignId]);
    qc.invalidateQueries(["leaderboard", campaignId]);
  };

  const approveMut = useMutation({ mutationFn: clipId => approveSubmission(campaignId, clipId), onSuccess: () => { invalidate(); setApproveClip(null); } });
  const rejectMut  = useMutation({ mutationFn: ({ clipId, reason, ban }) => rejectSubmission(campaignId, clipId, reason, ban), onSuccess: () => { invalidate(); setRejectClip(null); } });
  const updateMut  = useMutation({ mutationFn: ({ clip, m }) => updateClipMetrics(campaignId, clip.clipper_id, clip.id, m), onSuccess: () => { invalidate(); setMetricsClip(null); } });
  const deleteMut  = useMutation({ mutationFn: clip => deleteClip(campaignId, clip.clipper_id, clip.id), onSuccess: invalidate });
  const addMut     = useMutation({
    mutationFn: ({ clipper_id, ...rest }) => addClip(campaignId, clipper_id, rest),
    onSuccess: () => { invalidate(); setShowAddClip(false); }
  });

  const TABS = [
    { key: "pending",  label: "Pending",  count: campaign.pending_count,  color: "text-yellow-600" },
    { key: "approved", label: "Approved", count: campaign.approved_count, color: "text-green-600"  },
    { key: "flagged",  label: "Flagged",  count: campaign.flagged_count,  color: "text-red-600"    },
    { key: "rejected", label: "Rejected", count: campaign.rejected_count, color: "text-gray-500"   },
  ];

  return (
    <div>
      {approveClip && <ApproveDialog clip={approveClip} onClose={() => setApproveClip(null)} onConfirm={() => approveMut.mutate(approveClip.id)} />}
      {rejectClip  && <RejectDialog  clip={rejectClip}  onClose={() => setRejectClip(null)}  onConfirm={(reason, ban) => rejectMut.mutate({ clipId: rejectClip.id, reason, ban })} />}
      {metricsClip && <MetricsDialog clip={metricsClip} onClose={() => setMetricsClip(null)} onSave={m => updateMut.mutate({ clip: metricsClip, m })} />}
      {showAddClip && <AddClipModal campaignId={campaignId} clippers={clippers} onClose={() => setShowAddClip(false)} onAdd={d => addMut.mutate(d)} />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b border-gray-200 flex-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                subTab === t.key ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${subTab === t.key ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddClip(true)} className="ml-4 flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
          <Plus className="w-4 h-4" /> Add Submission
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No {subTab} submissions</p>
          </div>
        ) : (
          submissions.map(clip => (
            <SubmissionRow
              key={clip.id}
              clip={clip}
              campaignId={campaignId}
              onApprove={c => setApproveClip(c)}
              onReject={c => setRejectClip(c)}
              onFlag={c => flagSubmission(campaignId, c.id, "").then(() => invalidate())}
              onUpdateMetrics={c => setMetricsClip(c)}
              onDelete={c => deleteMut.mutate(c)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────────
function LeaderboardTab({ campaignId, rewardRate }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard", campaignId],
    queryFn: () => getLeaderboard(campaignId),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No approved submissions yet</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Rank</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clipper</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Handles</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved Clips</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Views</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(row => (
              <tr key={row.clipper_id} className={`hover:bg-gray-50 ${row.is_banned ? "opacity-40" : ""}`}>
                <td className="px-5 py-4">
                  <span className={`text-sm font-bold ${row.rank === 1 ? "text-yellow-500" : row.rank === 2 ? "text-gray-400" : row.rank === 3 ? "text-orange-400" : "text-gray-300"}`}>
                    #{row.rank}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        {row.name}
                        {row.is_banned && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Banned</span>}
                      </div>
                      {row.email && <div className="text-xs text-gray-400">{row.email}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400 space-x-1">
                  {row.tiktok_handle && <span>TT @{row.tiktok_handle.replace("@","")}</span>}
                  {row.instagram_handle && <span>IG @{row.instagram_handle.replace("@","")}</span>}
                  {row.youtube_handle && <span>YT @{row.youtube_handle.replace("@","")}</span>}
                </td>
                <td className="px-5 py-4 text-right font-medium text-gray-700">{row.approved_clips}</td>
                <td className="px-5 py-4 text-right font-medium text-gray-700">{fv(row.total_views)}</td>
                <td className="px-5 py-4 text-right font-bold text-green-600">${row.total_earnings.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Analysis Tab ──────────────────────────────────────────────────
function AnalysisTab({ campaignId }) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", campaignId],
    queryFn: () => getCampaignAnalysis(campaignId),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Analyzing...</div>;
  if (!analysis) return null;

  const FLAG_CFG = {
    clean:      { label: "Clean",      bar: "bg-green-500",  color: "text-green-600" },
    monitor:    { label: "Monitor",    bar: "bg-blue-500",   color: "text-blue-600"  },
    suspicious: { label: "Suspicious", bar: "bg-yellow-500", color: "text-yellow-600"},
    botted:     { label: "Botted",     bar: "bg-red-500",    color: "text-red-600"   },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Views",   value: fv(analysis.total_views)   },
          { label: "Organic Views", value: fv(analysis.organic_views), sub: `${analysis.organic_pct}% organic` },
          { label: "Suspect Views", value: fv(analysis.suspect_views) },
          { label: "Total Clips",   value: analysis.total_clips       },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-green-600 font-medium mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Bot Signal Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(FLAG_CFG).map(([flag, cfg]) => {
            const count = analysis.clips_by_flag[flag] || 0;
            const views = analysis.views_by_flag[flag] || 0;
            const pct = analysis.total_clips > 0 ? count / analysis.total_clips * 100 : 0;
            return (
              <div key={flag} className="flex items-center gap-3">
                <span className={`text-sm font-medium w-24 ${cfg.color}`}>{cfg.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm text-gray-600 w-6 text-right">{count}</span>
                <span className="text-xs text-gray-400 w-20 text-right">{fv(views)} views</span>
              </div>
            );
          })}
        </div>
      </div>

      {analysis.flagged_clips.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Flagged Clips ({analysis.flagged_clips.length})
          </h3>
          <div className="space-y-3">
            {analysis.flagged_clips.map(clip => (
              <div key={clip.id} className="rounded-lg p-3 bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${PLATFORM_CHIP[clip.platform] || "bg-gray-200 text-gray-700"}`}>
                    {PLATFORM_LABEL[clip.platform] || clip.platform}
                  </span>
                  <a href={clip.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-xs">{clip.url}</a>
                  <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{clip.bot_flag} ·{clip.bot_score}</span>
                </div>
                <ul className="space-y-0.5 mt-1">
                  {clip.bot_reasons.map((r, i) => <li key={i} className="text-xs text-red-700">→ {r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Top-up Modal ──────────────────────────────────────────────────
function TopupModal({ campaignId, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const { mutate, isPending, error } = useMutation({
    mutationFn: () => topupBudget(campaignId, parseFloat(amount)),
    onSuccess: () => { onDone(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Add Budget</h2>
        </div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount ($)</label>
        <input
          type="number" step="0.01" min="0.01"
          value={amount} onChange={e => setAmount(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
          placeholder="100.00"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error?.response?.data?.detail || "Failed"}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (!amount || parseFloat(amount) <= 0) return; mutate(); }}
            disabled={isPending}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add Budget"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payouts Tab ───────────────────────────────────────────────────
function PayoutsTab({ campaignId }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const { data: queue, isLoading: qLoading, refetch: refetchQueue } = useQuery({
    queryKey: ["payout-queue", campaignId],
    queryFn: () => getPayoutQueue(campaignId),
  });
  const { data: batches = [], isLoading: bLoading, refetch: refetchBatches } = useQuery({
    queryKey: ["payout-batches", campaignId],
    queryFn: () => getPayoutBatches(campaignId),
  });

  const payoutMut = useMutation({
    mutationFn: () => createPayout(campaignId, notes),
    onSuccess: () => {
      refetchQueue();
      refetchBatches();
      setNotes("");
      setPaying(false);
    },
  });

  const handleExport = async () => {
    try {
      const r = await exportCsv(campaignId);
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign_${campaignId}_clippers.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed");
    }
  };

  if (qLoading || bLoading) return <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>;

  const clips = queue?.clips || [];
  const total = queue?.total_amount || 0;

  return (
    <div className="space-y-6">
      {/* Payout queue */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Unpaid Approved Clips</h3>
            <p className="text-xs text-gray-400 mt-0.5">{clips.length} clips · ${total.toFixed(2)} total owed</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            {clips.length > 0 && !paying && (
              <button onClick={() => setPaying(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
                <CreditCard className="w-4 h-4" /> Mark as Paid
              </button>
            )}
          </div>
        </div>

        {paying && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              Mark {clips.length} clips as paid (${total.toFixed(2)} total)?
            </p>
            <label className="block text-xs text-amber-700 mb-1">Notes (optional)</label>
            <input
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none mb-3"
              placeholder="e.g. PayPal batch 2024-01-15"
            />
            <div className="flex gap-2">
              <button onClick={() => setPaying(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => payoutMut.mutate()} disabled={payoutMut.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {payoutMut.isPending ? "Processing..." : "Confirm Payout"}
              </button>
            </div>
          </div>
        )}

        {clips.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No unpaid approved clips</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clipper</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Post</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Views</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clips.map(clip => (
                  <tr key={clip.clip_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{clip.clipper_name}</div>
                      <div className="text-xs text-gray-400">{clip.clipper_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <a href={clip.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs truncate max-w-xs block">
                        {clip.platform} — {clip.url.slice(0, 40)}…
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{fv(clip.views_at_approval)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">${clip.earnings.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 text-base">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payout history */}
      {batches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Payout History</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clips</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clippers</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">#{b.id}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.clip_count}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.clipper_count}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">${b.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{b.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────
function SettingsTab({ campaign, campaignId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: campaign.description || "",
    guidelines: campaign.guidelines || "",
    tutorial_video_url: campaign.tutorial_video_url || "",
    min_payout: String(campaign.min_payout),
    max_payout_per_submission: String(campaign.max_payout_per_submission),
    auto_approve_hours: String(campaign.auto_approve_hours),
    end_date: campaign.end_date ? format(new Date(campaign.end_date), "yyyy-MM-dd") : "",
  });
  const set = k => e => setForm(f => ({...f,[k]:e.target.value}));
  const [saved, setSaved] = useState(false);

  const { mutate } = useMutation({
    mutationFn: d => updateCampaign(campaignId, d),
    onSuccess: () => {
      qc.invalidateQueries(["campaign", campaignId]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const platforms = (() => { try { return JSON.parse(campaign.allowed_platforms); } catch { return []; } })();

  const inputCls = "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Campaign Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Guidelines</label>
            <textarea value={form.guidelines} onChange={set("guidelines")} rows={4} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tutorial Video URL</label>
            <input value={form.tutorial_video_url} onChange={set("tutorial_video_url")} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-1">Payout Settings</h3>
        <p className="text-xs text-gray-400 mb-4">Budget, reward rate, and flat fee cannot be changed after the first submission.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget</label>
            <input disabled value={`$${campaign.budget.toFixed(2)}`} className={inputCls + " bg-gray-50 text-gray-400 cursor-not-allowed"} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reward Rate (locked)</label>
            <input disabled value={`$${campaign.reward_per_1k_views}/1K`} className={inputCls + " bg-gray-50 text-gray-400 cursor-not-allowed"} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Min Payout ($)</label>
            <input type="number" step="0.01" min="0" value={form.min_payout} onChange={set("min_payout")} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Payout Per Submission ($)</label>
            <input type="number" step="0.01" min="0" value={form.max_payout_per_submission} onChange={set("max_payout_per_submission")} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Review Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auto-Approve After (hours)</label>
            <input type="number" min="0" value={form.auto_approve_hours} onChange={set("auto_approve_hours")} className={inputCls} />
            <p className="text-xs text-gray-400 mt-0.5">0 = manual approval only</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
            <input type="date" value={form.end_date} onChange={set("end_date")} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-2">Public Submission Link</h3>
        <p className="text-xs text-gray-400 mb-3">Share this link with clippers so they can submit their content directly.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
            {window.location.origin}/submit/{campaign.submission_token}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/submit/${campaign.submission_token}`)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => mutate({ description: form.description, guidelines: form.guidelines, tutorial_video_url: form.tutorial_video_url, min_payout: parseFloat(form.min_payout)||0, max_payout_per_submission: parseFloat(form.max_payout_per_submission)||0, auto_approve_hours: parseInt(form.auto_approve_hours)||48, end_date: form.end_date || null })}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-green-600 text-white" : "bg-brand-600 text-white hover:bg-brand-700"}`}
        >
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddClipper, setShowAddClipper] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("submissions");

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
    refetchInterval: 15000,
  });

  const { data: clippers = [] } = useQuery({
    queryKey: ["clippers", id],
    queryFn: () => getClippers(id),
  });

  const addClipperMut = useMutation({
    mutationFn: data => addClipper(id, data),
    onSuccess: () => { qc.invalidateQueries(["clippers", id]); qc.invalidateQueries(["campaign", id]); setShowAddClipper(false); },
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!campaign) return <div className="p-8 text-red-400">Campaign not found.</div>;

  const platforms = (() => { try { return JSON.parse(campaign.allowed_platforms); } catch { return []; } })();
  const budgetPct = campaign.budget > 0 ? Math.min(100, (campaign.budget_spent / campaign.budget) * 100) : 0;
  const totalSubmissions = campaign.pending_count + campaign.approved_count + campaign.flagged_count + campaign.rejected_count;

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const r = await refreshAllViews(id);
      qc.invalidateQueries(["submissions", id]);
      qc.invalidateQueries(["campaign", id]);
      alert(`Refreshed ${r.updated} clips (${r.failed} failed)`);
    } catch {
      alert("Refresh failed");
    }
    setRefreshing(false);
  };

  const TABS = [
    { key: "submissions", label: "Submissions", badge: campaign.pending_count > 0 ? campaign.pending_count : 0 },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "analysis",    label: "Bot Analysis", badge: campaign.flagged_count > 0 ? campaign.flagged_count : 0 },
    { key: "payouts",     label: "Payouts" },
    { key: "settings",    label: "Settings" },
  ];

  return (
    <div className="p-8 space-y-6">
      {showAddClipper && (
        <AddClipperModal onClose={() => setShowAddClipper(false)} onAdd={d => addClipperMut.mutate(d)} />
      )}
      {showTopup && (
        <TopupModal
          campaignId={id}
          onClose={() => setShowTopup(false)}
          onDone={() => qc.invalidateQueries(["campaign", id])}
        />
      )}

      {/* Header */}
      <div>
        <button onClick={() => navigate("/campaigns")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaign.status === "active" ? "bg-green-100 text-green-700" : campaign.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                {campaign.status}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">{campaign.content_type}</span>
              {campaign.category && <span className="text-xs text-gray-400">{campaign.category}</span>}
              {platforms.map(p => (
                <span key={p} className={`text-xs px-2 py-0.5 rounded font-bold ${PLATFORM_CHIP[p] || "bg-gray-200 text-gray-700"}`}>
                  {PLATFORM_LABEL[p] || p}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            {campaign.description && <p className="text-gray-500 text-sm mt-1 max-w-2xl">{campaign.description}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleRefreshAll} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              <Zap className="w-4 h-4" /> {refreshing ? "Refreshing..." : "Refresh Views"}
            </button>
            <button onClick={() => setShowTopup(true)}
              className="flex items-center gap-2 px-3 py-2 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50">
              <Wallet className="w-4 h-4" /> Add Budget
            </button>
            <button onClick={() => setShowAddClipper(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Add Clipper
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Budget Remaining", value: `$${campaign.budget_remaining.toFixed(2)}`, sub: `of $${campaign.budget.toFixed(0)}`, icon: DollarSign, color: campaign.budget_remaining < campaign.budget * 0.1 ? "bg-red-500" : "bg-green-500" },
          { label: "Total Paid Out",   value: `$${campaign.budget_spent.toFixed(2)}`,    icon: TrendingUp,    color: "bg-brand-500" },
          { label: "CPM",              value: `$${campaign.reward_per_1k_views}/1K`,     icon: Eye,           color: "bg-blue-500" },
          { label: "Clippers",         value: campaign.clipper_count,                    icon: Users,         color: "bg-purple-500" },
          { label: "Submissions",      value: totalSubmissions,                          icon: BarChart2,     color: "bg-gray-500",
            sub: `${campaign.pending_count} pending` },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Budget</span>
          <span className="text-sm text-gray-500">${campaign.budget_spent.toFixed(2)} / ${campaign.budget.toFixed(2)} spent</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${budgetPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>{budgetPct.toFixed(1)}% used</span>
          <span>${campaign.budget_remaining.toFixed(2)} remaining</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "submissions" && <SubmissionsTab campaignId={id} campaign={campaign} clippers={clippers} />}
      {tab === "leaderboard" && <LeaderboardTab campaignId={id} rewardRate={campaign.reward_per_1k_views} />}
      {tab === "analysis"    && <AnalysisTab campaignId={id} />}
      {tab === "payouts"     && <PayoutsTab campaignId={id} />}
      {tab === "settings"    && <SettingsTab campaign={campaign} campaignId={id} />}
    </div>
  );
}
