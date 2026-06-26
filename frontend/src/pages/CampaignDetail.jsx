import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, RefreshCw, Trash2, CheckCircle, XCircle,
  Clock, ExternalLink, Eye, DollarSign, Users, TrendingUp,
} from "lucide-react";
import {
  getCampaign, getSubmissions, getClippers, createClipper,
  addSubmission, updateSubmission, deleteSubmission, refreshViews,
  updateCampaign,
} from "../api/client";

const PLATFORM_COLORS = {
  tiktok:    "bg-black text-white",
  youtube:   "bg-red-600 text-white",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  other:     "bg-gray-200 text-gray-700",
};

const PLATFORM_LABELS = {
  tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram", other: "Other",
};

const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n ?? 0);
}

function detectPlatform(url) {
  if (!url) return "other";
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  return "other";
}

function AddSubmissionModal({ campaignId, clippers, onClose, onAdded }) {
  const [mode, setMode] = useState("existing"); // existing | new
  const [clipperId, setClipperId] = useState("");
  const [newClipper, setNewClipper] = useState({ name: "", email: "", tiktok_handle: "", youtube_handle: "", instagram_handle: "" });
  const [postUrl, setPostUrl] = useState("");
  const [views, setViews] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!postUrl.trim()) { setError("Post URL is required"); return; }
    setSaving(true);
    setError("");
    try {
      let cid = parseInt(clipperId);
      if (mode === "new") {
        if (!newClipper.name.trim()) { setError("Clipper name is required"); setSaving(false); return; }
        const c = await createClipper(newClipper);
        cid = c.id;
      } else if (!cid) {
        setError("Select a clipper"); setSaving(false); return;
      }
      const platform = detectPlatform(postUrl);
      const sub = await addSubmission(campaignId, {
        clipper_id: cid,
        post_url: postUrl.trim(),
        platform,
        views: parseInt(views) || 0,
      });
      onAdded(sub);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add submission");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Add Clip Submission</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <div className="flex gap-2 mb-3">
              <button type="button"
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${mode === "existing" ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600"}`}
                onClick={() => setMode("existing")}>Existing Clipper</button>
              <button type="button"
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${mode === "new" ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600"}`}
                onClick={() => setMode("new")}>New Clipper</button>
            </div>

            {mode === "existing" ? (
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={clipperId} onChange={e => setClipperId(e.target.value)}
              >
                <option value="">Select a clipper…</option>
                {clippers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Name *" value={newClipper.name}
                  onChange={e => setNewClipper(n => ({ ...n, name: e.target.value }))} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Email" value={newClipper.email}
                  onChange={e => setNewClipper(n => ({ ...n, email: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="@tiktok" value={newClipper.tiktok_handle}
                    onChange={e => setNewClipper(n => ({ ...n, tiktok_handle: e.target.value }))} />
                  <input className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="@youtube" value={newClipper.youtube_handle}
                    onChange={e => setNewClipper(n => ({ ...n, youtube_handle: e.target.value }))} />
                  <input className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="@instagram" value={newClipper.instagram_handle}
                    onChange={e => setNewClipper(n => ({ ...n, instagram_handle: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Post URL *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={postUrl} onChange={e => setPostUrl(e.target.value)}
              placeholder="https://tiktok.com/@user/video/..."
            />
            {postUrl && (
              <p className="text-xs text-gray-400 mt-1">
                Platform detected: <span className="font-medium text-gray-600">{PLATFORM_LABELS[detectPlatform(postUrl)]}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current views (optional)</label>
            <input type="number" min="0"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={views} onChange={e => setViews(e.target.value)}
              placeholder="0" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg text-sm bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Adding…" : "Add Submission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpdateViewsModal({ sub, campaignId, rewardPer1k, onClose, onUpdated }) {
  const [views, setViews] = useState(String(sub.views || 0));
  const [likes, setLikes] = useState(String(sub.likes || 0));
  const [status, setStatus] = useState(sub.status);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSubmission(campaignId, sub.id, {
        views: parseInt(views) || 0,
        likes: parseInt(likes) || 0,
        status,
      });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Update Views</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500 truncate">{sub.post_url}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Views</label>
              <input type="number" min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={views} onChange={e => setViews(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Likes</label>
              <input type="number" min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={likes} onChange={e => setLikes(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">
            Estimated earnings: <span className="font-medium text-green-600">
              ${((parseInt(views) || 0) / 1000 * rewardPer1k).toFixed(2)}
            </span>
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg text-sm bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [clippers, setClippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [sortBy, setSortBy] = useState("views");

  useEffect(() => {
    Promise.all([
      getCampaign(id),
      getSubmissions(id),
      getClippers(),
    ]).then(([c, s, cl]) => {
      setCampaign(c);
      setSubmissions(s);
      setClippers(cl);
    }).finally(() => setLoading(false));
  }, [id]);

  async function doRefreshViews(sub) {
    setRefreshingId(sub.id);
    try {
      const updated = await refreshViews(id, sub.id);
      setSubmissions(ss => ss.map(s => s.id === sub.id ? updated : s));
    } finally {
      setRefreshingId(null);
    }
  }

  async function doDelete(subId) {
    if (!confirm("Remove this submission?")) return;
    await deleteSubmission(id, subId);
    setSubmissions(ss => ss.filter(s => s.id !== subId));
  }

  const sorted = [...submissions].sort((a, b) => {
    if (sortBy === "views") return b.views - a.views;
    if (sortBy === "earnings") return b.estimated_earnings - a.estimated_earnings;
    if (sortBy === "date") return new Date(b.submitted_at) - new Date(a.submitted_at);
    return 0;
  });

  const totalViews = submissions.reduce((s, x) => s + x.views, 0);
  const totalEarnings = submissions.reduce((s, x) => s + x.estimated_earnings, 0);
  const approvedCount = submissions.filter(s => s.status === "approved").length;

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!campaign) return <div className="p-8 text-red-500">Campaign not found.</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate("/campaigns")}
          className="mt-0.5 p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              campaign.status === "active" ? "bg-green-100 text-green-700" :
              campaign.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
            }`}>{campaign.status}</span>
          </div>
          {campaign.description && (
            <p className="text-sm text-gray-500">{campaign.description}</p>
          )}
          {campaign.source_video_url && (
            <a href={campaign.source_video_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-brand-500 hover:underline mt-1">
              <ExternalLink className="w-3 h-3" /> Source video
            </a>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Clip
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Eye, label: "Total Views", value: fmt(totalViews), color: "text-blue-600" },
          { icon: DollarSign, label: "Total Earned", value: `$${totalEarnings.toFixed(2)}`, color: "text-green-600" },
          { icon: Users, label: "Clippers", value: new Set(submissions.map(s => s.clipper_id)).size, color: "text-purple-600" },
          { icon: TrendingUp, label: "Approved", value: `${approvedCount} / ${submissions.length}`, color: "text-orange-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Submissions table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Submissions ({submissions.length})</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by</span>
            <select className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none"
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="views">Views</option>
              <option value="earnings">Earnings</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No submissions yet. Add the first clip above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="px-5 py-3 font-medium">Clipper</th>
                  <th className="px-5 py-3 font-medium">Platform</th>
                  <th className="px-5 py-3 font-medium">Post</th>
                  <th className="px-5 py-3 font-medium text-right">Views</th>
                  <th className="px-5 py-3 font-medium text-right">Earnings</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last checked</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{sub.clipper_name || "—"}</p>
                      {sub.clipper_email && <p className="text-xs text-gray-400">{sub.clipper_email}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[sub.platform] || PLATFORM_COLORS.other}`}>
                        {PLATFORM_LABELS[sub.platform] || sub.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <a href={sub.post_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-brand-500 hover:underline truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate text-xs">{sub.post_url}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">{fmt(sub.views)}</td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">${sub.estimated_earnings.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                        {sub.status === "approved" ? <CheckCircle className="inline w-3 h-3 mr-0.5" /> :
                         sub.status === "rejected" ? <XCircle className="inline w-3 h-3 mr-0.5" /> :
                         <Clock className="inline w-3 h-3 mr-0.5" />}
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {sub.last_checked_at
                        ? new Date(sub.last_checked_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          title="Refresh views"
                          onClick={() => doRefreshViews(sub)}
                          disabled={refreshingId === sub.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === sub.id ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          title="Update views/status"
                          onClick={() => setEditSub(sub)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Remove"
                          onClick={() => doDelete(sub.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddSubmissionModal
          campaignId={id}
          clippers={clippers}
          onClose={() => setShowAdd(false)}
          onAdded={sub => {
            setSubmissions(ss => [sub, ...ss]);
            setClippers(cl => cl.find(c => c.id === sub.clipper_id) ? cl : [...cl, { id: sub.clipper_id, name: sub.clipper_name, email: sub.clipper_email }]);
            setShowAdd(false);
          }}
        />
      )}

      {editSub && (
        <UpdateViewsModal
          sub={editSub}
          campaignId={id}
          rewardPer1k={campaign.reward_per_1k_views}
          onClose={() => setEditSub(null)}
          onUpdated={updated => {
            setSubmissions(ss => ss.map(s => s.id === updated.id ? updated : s));
            setEditSub(null);
          }}
        />
      )}
    </div>
  );
}
