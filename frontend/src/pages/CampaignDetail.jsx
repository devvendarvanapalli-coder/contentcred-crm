import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaign, getClippers, addClipper, updateClipper, deleteClipper,
  getClips, addClip, updateClipViews, deleteClip,
} from "../api/client";
import {
  ArrowLeft, Plus, Eye, RefreshCw, Trash2, ExternalLink,
  Users, Scissors, TrendingUp, X, ChevronDown, ChevronUp, Edit3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatViews(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PLATFORM_ICON = { tiktok: "TT", instagram: "IG", youtube: "YT" };
const PLATFORM_BG = {
  tiktok: "bg-black text-white",
  instagram: "bg-gradient-to-tr from-pink-500 to-yellow-400 text-white",
  youtube: "bg-red-600 text-white",
};

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
              placeholder="John Doe" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={set("email")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="john@email.com" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["tiktok_handle", "@tiktok"], ["instagram_handle", "@instagram"], ["youtube_handle", "@youtube"]].map(([k, ph]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-400">{ph.split("@")[1].charAt(0).toUpperCase() + ph.split("@")[1].slice(1)}</label>
                <input value={form[k]} onChange={set(k)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                  placeholder={ph} />
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
  const [form, setForm] = useState({ url: "", platform: "tiktok", title: "", current_views: "" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Clip</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ ...form, current_views: parseInt(form.current_views) || 0 }); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clip URL *</label>
            <input required value={form.url} onChange={set("url")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://www.tiktok.com/@user/video/..." />
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Views</label>
              <input type="number" min="0" value={form.current_views} onChange={set("current_views")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title (optional)</label>
            <input value={form.title} onChange={set("title")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Clip title or description" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">Add Clip</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Update Views Inline ───────────────────────────────────────────
function ViewsInput({ clip, campaignId, clipperId, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(clip.current_views));

  const handleSave = () => {
    onUpdate(parseInt(val) || 0);
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex items-center gap-1">
        <input
          autoFocus
          type="number" min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-28 border border-brand-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="submit" className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-brand-600 group"
    >
      <Eye className="w-4 h-4 text-gray-400 group-hover:text-brand-500" />
      {formatViews(clip.current_views)}
      <Edit3 className="w-3 h-3 text-gray-300 group-hover:text-brand-400" />
    </button>
  );
}

// ── Clipper Row ───────────────────────────────────────────────────
function ClipperRow({ clipper, campaignId }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddClip, setShowAddClip] = useState(false);
  const qc = useQueryClient();

  const { data: clips = [] } = useQuery({
    queryKey: ["clips", campaignId, clipper.id],
    queryFn: () => getClips(campaignId, clipper.id),
    enabled: expanded,
  });

  const addClipMut = useMutation({
    mutationFn: (data) => addClip(campaignId, clipper.id, data),
    onSuccess: () => {
      qc.invalidateQueries(["clips", campaignId, clipper.id]);
      qc.invalidateQueries(["clippers", campaignId]);
      qc.invalidateQueries(["campaign", campaignId]);
      setShowAddClip(false);
    },
  });

  const updateViewsMut = useMutation({
    mutationFn: ({ clipId, views }) => updateClipViews(campaignId, clipper.id, clipId, views),
    onSuccess: () => {
      qc.invalidateQueries(["clips", campaignId, clipper.id]);
      qc.invalidateQueries(["clippers", campaignId]);
      qc.invalidateQueries(["campaign", campaignId]);
    },
  });

  const deleteClipMut = useMutation({
    mutationFn: (clipId) => deleteClip(campaignId, clipper.id, clipId),
    onSuccess: () => {
      qc.invalidateQueries(["clips", campaignId, clipper.id]);
      qc.invalidateQueries(["clippers", campaignId]);
      qc.invalidateQueries(["campaign", campaignId]);
    },
  });

  const deleteClipperMut = useMutation({
    mutationFn: () => deleteClipper(campaignId, clipper.id),
    onSuccess: () => {
      qc.invalidateQueries(["clippers", campaignId]);
      qc.invalidateQueries(["campaign", campaignId]);
    },
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {showAddClip && (
        <AddClipModal
          onClose={() => setShowAddClip(false)}
          onAdd={(data) => addClipMut.mutate(data)}
        />
      )}

      {/* Clipper header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
          {clipper.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{clipper.name}</span>
            {clipper.email && <span className="text-xs text-gray-400">{clipper.email}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {clipper.tiktok_handle && <span className="text-xs text-gray-400">TT: @{clipper.tiktok_handle.replace("@","")}</span>}
            {clipper.instagram_handle && <span className="text-xs text-gray-400">IG: @{clipper.instagram_handle.replace("@","")}</span>}
            {clipper.youtube_handle && <span className="text-xs text-gray-400">YT: @{clipper.youtube_handle.replace("@","")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-gray-900">{formatViews(clipper.total_views)}</div>
            <div className="text-xs text-gray-400">views</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-900">{clipper.clip_count}</div>
            <div className="text-xs text-gray-400">clips</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Clips list */}
      {expanded && (
        <div className="border-t border-gray-50">
          {clips.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No clips yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clips.map((clip) => (
                <div key={clip.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${PLATFORM_BG[clip.platform] || "bg-gray-200 text-gray-600"}`}>
                    {PLATFORM_ICON[clip.platform] || clip.platform.toUpperCase()}
                  </span>
                  <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {clip.title || clip.url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <ViewsInput
                    clip={clip}
                    campaignId={campaignId}
                    clipperId={clipper.id}
                    onUpdate={(views) => updateViewsMut.mutate({ clipId: clip.id, views })}
                  />
                  {clip.last_checked_at && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {formatDistanceToNow(new Date(clip.last_checked_at), { addSuffix: true })}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this clip?")) deleteClipMut.mutate(clip.id);
                    }}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Clip actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddClip(true); }}
              className="flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:text-brand-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Clip
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove "${clipper.name}" from this campaign?`)) deleteClipperMut.mutate();
              }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Clipper
            </button>
          </div>
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

  // Sort clippers by total views desc
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
        <button
          onClick={() => navigate("/campaigns")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            {campaign.description && <p className="text-gray-500 text-sm mt-1">{campaign.description}</p>}
          </div>
          <button
            onClick={() => setShowAddClipper(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex-shrink-0 ml-4"
          >
            <Plus className="w-4 h-4" /> Add Clipper
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Views", value: formatViews(campaign.total_views), icon: Eye, color: "bg-brand-500" },
          { label: "Clippers", value: campaign.clipper_count, icon: Users, color: "bg-blue-500" },
          { label: "Reward Rate", value: campaign.reward_per_1k_views > 0 ? `$${campaign.reward_per_1k_views}/1K` : "—", icon: TrendingUp, color: "bg-green-500" },
          { label: "Total Earned", value: earned ? `$${earned}` : "—", icon: Scissors, color: "bg-yellow-500" },
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

      {/* Progress bar */}
      {progress !== null && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatViews(campaign.total_views)} / {formatViews(campaign.target_views)} views
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{progress.toFixed(1)}% of target reached</p>
        </div>
      )}

      {/* Leaderboard header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Clippers ({clippers.length})
        </h2>
        <span className="text-xs text-gray-400">Sorted by total views · Click to expand clips</span>
      </div>

      {/* Clipper rows */}
      {loadingClippers ? (
        <div className="text-gray-400 text-sm">Loading clippers...</div>
      ) : sortedClippers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No clippers yet</p>
          <p className="text-sm mt-1">Add your first clipper to start tracking views</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedClippers.map((clipper, idx) => (
            <div key={clipper.id} className="flex items-start gap-3">
              <div className="w-7 text-center text-sm font-bold text-gray-300 mt-4 flex-shrink-0">
                #{idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <ClipperRow clipper={clipper} campaignId={id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
