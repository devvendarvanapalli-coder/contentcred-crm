import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaign, getClippers, addClipper, deleteClipper,
  getClips, addClip, updateClipMetrics, deleteClip,
  getCampaignAnalysis,
} from "../api/client";
import {
  ArrowLeft, Plus, Eye, Trash2, ExternalLink,
  Users, Scissors, TrendingUp, X, ChevronDown, ChevronUp,
  AlertTriangle, ShieldCheck, ShieldAlert, Activity, BarChart2,
  ThumbsUp, MessageCircle, Share2, RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────
function fv(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const BOT_FLAG_CONFIG = {
  clean:      { label: "Clean",      color: "bg-green-100 text-green-700",   icon: ShieldCheck,  bar: "bg-green-500" },
  monitor:    { label: "Monitor",    color: "bg-blue-100 text-blue-700",     icon: Activity,     bar: "bg-blue-500" },
  suspicious: { label: "Suspicious", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle, bar: "bg-yellow-500" },
  botted:     { label: "Botted",     color: "bg-red-100 text-red-700",       icon: ShieldAlert,  bar: "bg-red-500" },
};

function BotBadge({ flag, score }) {
  const cfg = BOT_FLAG_CONFIG[flag] || BOT_FLAG_CONFIG.clean;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label} {score > 0 && <span className="opacity-70">·{score}</span>}
    </span>
  );
}

function BotScoreBar({ score }) {
  const color = score <= 20 ? "bg-green-500" : score <= 45 ? "bg-blue-500" : score <= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{score}</span>
    </div>
  );
}

const PLATFORM_BG = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
};
const PLATFORM_LABEL = { tiktok: "TT", instagram: "IG", youtube: "YT" };

// ── Metrics Update Modal ──────────────────────────────────────────
function MetricsModal({ clip, campaignId, clipperId, onClose, onSave }) {
  const [form, setForm] = useState({
    current_views: String(clip.current_views),
    likes:    String(clip.likes),
    comments: String(clip.comments),
    shares:   String(clip.shares),
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const er = form.current_views > 0
    ? (((parseInt(form.likes)||0) + (parseInt(form.comments)||0) + (parseInt(form.shares)||0)) / parseInt(form.current_views) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Update Metrics</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="mb-3 text-xs text-gray-400 truncate">{clip.url}</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              current_views: parseInt(form.current_views) || 0,
              likes:    parseInt(form.likes) || 0,
              comments: parseInt(form.comments) || 0,
              shares:   parseInt(form.shares) || 0,
            });
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Views *
            </label>
            <input required type="number" min="0" value={form.current_views} onChange={set("current_views")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["likes", ThumbsUp, "Likes"], ["comments", MessageCircle, "Comments"], ["shares", Share2, "Shares"]].map(([k, Icon, label]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </label>
                <input type="number" min="0" value={form[k]} onChange={set(k)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
            Engagement rate: <span className="font-semibold text-gray-800">{er}%</span>
            <span className="ml-2 text-gray-400">(likes+comments+shares / views)</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">
              Save &amp; Analyze
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Clipper Modal ─────────────────────────────────────────────
function AddClipperModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", email: "", tiktok_handle: "", instagram_handle: "", youtube_handle: "", notes: "" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Clipper</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onAdd(form); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name *</label>
            <input required value={form.name} onChange={set("name")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. John Doe" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={set("email")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="john@email.com" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["tiktok_handle", "TikTok handle"], ["instagram_handle", "Instagram handle"], ["youtube_handle", "YouTube handle"]].map(([k, ph]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-400">{ph.split(" ")[0]}</label>
                <input value={form[k]} onChange={set(k)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                  placeholder="@handle" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Add Clipper</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Clip Modal ────────────────────────────────────────────────
function AddClipModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ url: "", platform: "tiktok", title: "", current_views: "", likes: "", comments: "", shares: "" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Submit Clip</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onAdd({
            ...form,
            current_views: parseInt(form.current_views) || 0,
            likes:    parseInt(form.likes) || 0,
            comments: parseInt(form.comments) || 0,
            shares:   parseInt(form.shares) || 0,
          });
        }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clip URL *</label>
            <input required value={form.url} onChange={set("url")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://www.tiktok.com/@..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</label>
              <select value={form.platform} onChange={set("platform")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views</label>
              <input type="number" min="0" value={form.current_views} onChange={set("current_views")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares"]].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-400">{label}</label>
                <input type="number" min="0" value={form[k]} onChange={set(k)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="0" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title (optional)</label>
            <input value={form.title} onChange={set("title")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Clip title or description" />
          </div>
          <p className="text-xs text-gray-400">Bot detection runs automatically on save using platform engagement baselines.</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Submit &amp; Analyze</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Clipper Row ───────────────────────────────────────────────────
function ClipperRow({ clipper, campaignId }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddClip, setShowAddClip] = useState(false);
  const [metricsClip, setMetricsClip] = useState(null);
  const qc = useQueryClient();

  const { data: clips = [] } = useQuery({
    queryKey: ["clips", campaignId, clipper.id],
    queryFn: () => getClips(campaignId, clipper.id),
    enabled: expanded,
  });

  const invalidate = () => {
    qc.invalidateQueries(["clips", campaignId, clipper.id]);
    qc.invalidateQueries(["clippers", campaignId]);
    qc.invalidateQueries(["campaign", campaignId]);
    qc.invalidateQueries(["analysis", campaignId]);
  };

  const addClipMut = useMutation({ mutationFn: (d) => addClip(campaignId, clipper.id, d), onSuccess: () => { invalidate(); setShowAddClip(false); } });
  const updateMut  = useMutation({ mutationFn: ({ clipId, m }) => updateClipMetrics(campaignId, clipper.id, clipId, m), onSuccess: () => { invalidate(); setMetricsClip(null); } });
  const deleteMut  = useMutation({ mutationFn: (clipId) => deleteClip(campaignId, clipper.id, clipId), onSuccess: invalidate });
  const deleteClipperMut = useMutation({ mutationFn: () => deleteClipper(campaignId, clipper.id), onSuccess: invalidate });

  const hasBotIssue = clipper.flagged_clips > 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasBotIssue ? "border-red-200" : "border-gray-100"}`}>
      {showAddClip && <AddClipModal onClose={() => setShowAddClip(false)} onAdd={(d) => addClipMut.mutate(d)} />}
      {metricsClip && (
        <MetricsModal
          clip={metricsClip}
          campaignId={campaignId}
          clipperId={clipper.id}
          onClose={() => setMetricsClip(null)}
          onSave={(m) => updateMut.mutate({ clipId: metricsClip.id, m })}
        />
      )}

      {/* Clipper header */}
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${hasBotIssue ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"}`}>
          {clipper.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{clipper.name}</span>
            {clipper.email && <span className="text-xs text-gray-400">{clipper.email}</span>}
            {hasBotIssue && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> {clipper.flagged_clips} flagged
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {clipper.tiktok_handle    && <span className="text-xs text-gray-400">TT @{clipper.tiktok_handle.replace("@","")}</span>}
            {clipper.instagram_handle && <span className="text-xs text-gray-400">IG @{clipper.instagram_handle.replace("@","")}</span>}
            {clipper.youtube_handle   && <span className="text-xs text-gray-400">YT @{clipper.youtube_handle.replace("@","")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm flex-shrink-0">
          <div className="text-center">
            <div className="font-bold text-gray-900">{fv(clipper.total_views)}</div>
            <div className="text-xs text-gray-400">total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-600">{fv(clipper.organic_views)}</div>
            <div className="text-xs text-gray-400">organic</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-900">{clipper.clip_count}</div>
            <div className="text-xs text-gray-400">clips</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Clips */}
      {expanded && (
        <div className="border-t border-gray-50">
          {clips.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No clips yet — add one below</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clips.map((clip) => {
                const cfg = BOT_FLAG_CONFIG[clip.bot_flag] || BOT_FLAG_CONFIG.clean;
                const reasons = (() => { try { return JSON.parse(clip.bot_reasons || "[]"); } catch { return []; } })();
                return (
                  <div key={clip.id} className={`px-4 py-3 ${clip.bot_flag === "botted" ? "bg-red-50" : clip.bot_flag === "suspicious" ? "bg-yellow-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${PLATFORM_BG[clip.platform] || "bg-gray-200 text-gray-700"}`}>
                        {PLATFORM_LABEL[clip.platform] || clip.platform.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a href={clip.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1 max-w-xs"
                          onClick={(e) => e.stopPropagation()}>
                          {clip.title || clip.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {/* Metrics row */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fv(clip.current_views)}</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{fv(clip.likes)}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{fv(clip.comments)}</span>
                          <span className="flex items-center gap-0.5"><Share2 className="w-3 h-3" />{fv(clip.shares)}</span>
                          {clip.current_views > 0 && (
                            <span className="text-gray-400">
                              ER: {(((clip.likes + clip.comments + clip.shares) / clip.current_views) * 100).toFixed(2)}%
                            </span>
                          )}
                          {clip.last_checked_at && (
                            <span className="text-gray-300">{formatDistanceToNow(new Date(clip.last_checked_at), { addSuffix: true })}</span>
                          )}
                        </div>
                        {/* Bot score bar */}
                        <div className="mt-1.5 w-48">
                          <BotScoreBar score={clip.bot_score} />
                        </div>
                        {/* Reasons (collapsed) */}
                        {(clip.bot_flag === "suspicious" || clip.bot_flag === "botted") && reasons.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {reasons.map((r, i) => (
                              <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <BotBadge flag={clip.bot_flag} score={clip.bot_score} />
                        <button
                          onClick={() => setMetricsClip(clip)}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          <RefreshCw className="w-3 h-3" /> Update
                        </button>
                        <button onClick={() => { if (confirm("Delete clip?")) deleteMut.mutate(clip.id); }}
                          className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
            <button onClick={(e) => { e.stopPropagation(); setShowAddClip(true); }}
              className="flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:text-brand-700">
              <Plus className="w-3.5 h-3.5" /> Add Clip
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${clipper.name}"?`)) deleteClipperMut.mutate(); }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" /> Remove Clipper
            </button>
          </div>
        </div>
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

  const flagOrder = ["botted", "suspicious", "monitor", "clean"];

  return (
    <div className="space-y-6">
      {/* Organic vs suspect summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Views",   value: fv(analysis.total_views),   color: "bg-brand-500" },
          { label: "Organic Views", value: fv(analysis.organic_views), color: "bg-green-500", sub: `${analysis.organic_pct}% organic` },
          { label: "Suspect Views", value: fv(analysis.suspect_views), color: "bg-red-500" },
          { label: "Total Clips",   value: analysis.total_clips,       color: "bg-blue-500" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-7 h-7 rounded-lg ${color} mb-2`} />
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-green-600 font-medium mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Breakdown by flag */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Clip Breakdown by Status</h3>
        <div className="space-y-3">
          {flagOrder.map((flag) => {
            const cfg = BOT_FLAG_CONFIG[flag];
            const Icon = cfg.icon;
            const count = analysis.clips_by_flag[flag] || 0;
            const views = analysis.views_by_flag[flag] || 0;
            const pct = analysis.total_clips > 0 ? (count / analysis.total_clips * 100).toFixed(0) : 0;
            return (
              <div key={flag} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 capitalize">{flag}</span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                <span className="text-xs text-gray-400 w-20 text-right">{fv(views)} views</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagged clips list */}
      {analysis.flagged_clips.length > 0 ? (
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Flagged Clips ({analysis.flagged_clips.length})
          </h3>
          <div className="space-y-4">
            {analysis.flagged_clips.map((clip) => (
              <div key={clip.id} className={`rounded-lg p-3 ${clip.bot_flag === "botted" ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${PLATFORM_BG[clip.platform] || "bg-gray-200 text-gray-700"}`}>
                      {PLATFORM_LABEL[clip.platform] || clip.platform}
                    </span>
                    <a href={clip.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate max-w-xs flex items-center gap-1">
                      {clip.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <BotBadge flag={clip.bot_flag} score={clip.bot_score} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span><Eye className="w-3 h-3 inline" /> {fv(clip.current_views)}</span>
                  <span><ThumbsUp className="w-3 h-3 inline" /> {fv(clip.likes)}</span>
                  <span><MessageCircle className="w-3 h-3 inline" /> {fv(clip.comments)}</span>
                  {clip.current_views > 0 && (
                    <span>ER: {(((clip.likes + clip.comments + clip.shares) / clip.current_views) * 100).toFixed(2)}%</span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {clip.bot_reasons.map((r, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                      <span className="flex-shrink-0 mt-0.5">→</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-green-600">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No flagged clips</p>
          <p className="text-sm text-gray-400 mt-0.5">All submissions look organic</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddClipper, setShowAddClipper] = useState(false);
  const [tab, setTab] = useState("clippers"); // clippers | analysis

  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
    refetchInterval: 30000,
  });

  const { data: clippers = [], isLoading: loadingClippers } = useQuery({
    queryKey: ["clippers", id],
    queryFn: () => getClippers(id),
    refetchInterval: 30000,
  });

  const addClipperMut = useMutation({
    mutationFn: (data) => addClipper(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["clippers", id]);
      qc.invalidateQueries(["campaign", id]);
      setShowAddClipper(false);
    },
  });

  if (loadingCampaign) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!campaign) return <div className="p-8 text-red-400">Campaign not found.</div>;

  const earned = campaign.reward_per_1k_views > 0
    ? ((campaign.total_views / 1000) * campaign.reward_per_1k_views).toFixed(2)
    : null;

  const progress = campaign.target_views > 0
    ? Math.min(100, (campaign.total_views / campaign.target_views) * 100)
    : null;

  const sortedClippers = [...clippers].sort((a, b) => b.total_views - a.total_views);

  return (
    <div className="p-8 space-y-6">
      {showAddClipper && (
        <AddClipperModal
          onClose={() => setShowAddClipper(false)}
          onAdd={(data) => addClipperMut.mutate(data)}
        />
      )}

      {/* Header */}
      <div>
        <button onClick={() => navigate("/campaigns")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                campaign.status === "active" ? "bg-green-100 text-green-700" :
                campaign.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
              }`}>{campaign.status}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{campaign.platform}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            {campaign.description && <p className="text-gray-500 text-sm mt-1">{campaign.description}</p>}
          </div>
          <button onClick={() => setShowAddClipper(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex-shrink-0 ml-4">
            <Plus className="w-4 h-4" /> Add Clipper
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Views",   value: fv(campaign.total_views),  icon: Eye,        color: "bg-brand-500" },
          { label: "Clippers",      value: campaign.clipper_count,     icon: Users,      color: "bg-blue-500" },
          { label: "$/1K Views",    value: campaign.reward_per_1k_views > 0 ? `$${campaign.reward_per_1k_views}` : "—", icon: TrendingUp, color: "bg-green-500" },
          { label: "Total Earned",  value: earned ? `$${earned}` : "—", icon: Scissors,  color: "bg-yellow-500" },
          { label: "Flagged Clips", value: campaign.flagged_clips,     icon: AlertTriangle, color: campaign.flagged_clips > 0 ? "bg-red-500" : "bg-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {progress !== null && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {fv(campaign.total_views)} / {fv(campaign.target_views)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{progress.toFixed(1)}% of target</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: "clippers", label: "Clippers", icon: Users },
          { key: "analysis", label: "Bot Analysis", icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === "analysis" && campaign.flagged_clips > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {campaign.flagged_clips}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "clippers" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Clippers ({clippers.length})</h2>
            <span className="text-xs text-gray-400">Ranked by total views · click to expand</span>
          </div>
          {loadingClippers ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : sortedClippers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No clippers yet</p>
              <p className="text-sm mt-1">Add clippers to start tracking their views</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedClippers.map((clipper, idx) => (
                <div key={clipper.id} className="flex items-start gap-3">
                  <div className="w-7 text-center text-sm font-bold text-gray-300 mt-4 flex-shrink-0">#{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <ClipperRow clipper={clipper} campaignId={id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "analysis" && <AnalysisTab campaignId={id} />}
    </div>
  );
}
