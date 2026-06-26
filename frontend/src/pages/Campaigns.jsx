import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Play, Pause, StopCircle, ExternalLink, Users, Eye, DollarSign } from "lucide-react";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "../api/client";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  ended:  "bg-gray-100 text-gray-500",
};

const STATUS_ICONS = {
  active: Play,
  paused: Pause,
  ended:  StopCircle,
};

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    source_video_url: "",
    reward_per_1k_views: "",
    status: "active",
    start_date: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        reward_per_1k_views: parseFloat(form.reward_per_1k_views) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      const c = await createCampaign(payload);
      onCreated(c);
    } catch {
      setError("Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Summer Rap Drop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={2} value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="What is this campaign about?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source video URL</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.source_video_url} onChange={e => set("source_video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reward / 1K views ($)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.reward_per_1k_views} onChange={e => set("reward_per_1k_views", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.status} onChange={e => set("status", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg text-sm bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCampaigns().then(setCampaigns).finally(() => setLoading(false));
  }, []);

  async function toggleStatus(c) {
    const next = c.status === "active" ? "paused" : "active";
    const updated = await updateCampaign(c.id, { status: next });
    setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, ...updated } : x));
  }

  async function remove(id) {
    if (!confirm("Delete this campaign and all its submissions?")) return;
    await deleteCampaign(id);
    setCampaigns(cs => cs.filter(c => c.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clipping Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage campaigns and track clipper views</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading campaigns…</div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-gray-500">No campaigns yet. Create your first one to start tracking clips.</p>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {campaigns.map(c => {
            const StatusIcon = STATUS_ICONS[c.status] || Play;
            const earnings = ((c.total_views / 1000) * c.reward_per_1k_views).toFixed(2);
            return (
              <div key={c.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[c.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Eye className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">{fmt(c.total_views)}</p>
                    <p className="text-xs text-gray-400">Views</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Users className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">{c.total_clippers}</p>
                    <p className="text-xs text-gray-400">Clippers</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">${earnings}</p>
                    <p className="text-xs text-gray-400">Earned</p>
                  </div>
                </div>

                {c.source_video_url && (
                  <div className="flex items-center gap-1.5 text-xs text-brand-500 mb-3 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <a href={c.source_video_url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="truncate hover:underline">{c.source_video_url}</a>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    ${c.reward_per_1k_views}/1K views · {c.total_submissions} clips
                  </span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleStatus(c)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      {c.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => remove(c.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={c => { setCampaigns(cs => [c, ...cs]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
