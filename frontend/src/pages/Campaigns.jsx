import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "../api/client";
import { Plus, Eye, Users, Scissors, ChevronRight, Pause, Play, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PLATFORM_COLORS = {
  tiktok: "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube: "bg-red-500 text-white",
  any: "bg-gray-500 text-white",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  ended: "bg-gray-100 text-gray-500",
};

function formatViews(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function NewCampaignModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    platform: "any",
    reward_per_1k_views: "",
    target_views: "",
    start_date: "",
    end_date: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      ...form,
      reward_per_1k_views: parseFloat(form.reward_per_1k_views) || 0,
      target_views: parseInt(form.target_views) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign Name *</label>
            <input
              required
              value={form.name}
              onChange={set("name")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Summer Viral Push"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={2}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="What do clippers need to post?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</label>
              <select value={form.platform} onChange={set("platform")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="any">Any</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">$ / 1K Views</label>
              <input
                type="number" step="0.01" min="0"
                value={form.reward_per_1k_views}
                onChange={set("reward_per_1k_views")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="5.00"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target Views</label>
            <input
              type="number" min="0"
              value={form.target_views}
              onChange={set("target_views")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="1000000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
              <input type="date" value={form.start_date} onChange={set("start_date")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
              <input type="date" value={form.end_date} onChange={set("end_date")}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700">
              Create Campaign
            </button>
          </div>
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

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => { qc.invalidateQueries(["campaigns"]); setShowModal(false); },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => updateCampaign(id, { status }),
    onSuccess: () => qc.invalidateQueries(["campaigns"]),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => qc.invalidateQueries(["campaigns"]),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  const totalViews = campaigns.reduce((s, c) => s + c.total_views, 0);
  const totalClippers = campaigns.reduce((s, c) => s + c.clipper_count, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Clipping Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Track views across all your clipper accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Scissors, color: "bg-brand-500" },
          { label: "Total Clippers", value: totalClippers, icon: Users, color: "bg-blue-500" },
          { label: "Total Views", value: formatViews(totalViews), icon: Eye, color: "bg-green-500" },
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
        <div className="text-center py-16 text-gray-400">
          <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first clipping campaign to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const progress = c.target_views > 0 ? Math.min(100, (c.total_views / c.target_views) * 100) : null;
            const earned = c.reward_per_1k_views > 0
              ? `$${((c.total_views / 1000) * c.reward_per_1k_views).toFixed(2)}`
              : null;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[c.platform] || PLATFORM_COLORS.any}`}>
                          {c.platform}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">{c.name}</h3>
                      {c.description && (
                        <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{c.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{formatViews(c.total_views)}</span> views
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{c.clipper_count}</span> clippers
                    </div>
                    {c.reward_per_1k_views > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-green-600">${c.reward_per_1k_views}</span>/1K views
                      </div>
                    )}
                    {earned && (
                      <div className="text-sm">
                        Earned: <span className="font-semibold text-green-600">{earned}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 ml-auto">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  {progress !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{formatViews(c.total_views)} / {formatViews(c.target_views)}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div
                  className="border-t border-gray-50 px-5 py-3 flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => toggleStatus.mutate({
                      id: c.id,
                      status: c.status === "active" ? "paused" : "active",
                    })}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
                  >
                    {c.status === "active"
                      ? <><Pause className="w-3.5 h-3.5" /> Pause</>
                      : <><Play className="w-3.5 h-3.5" /> Resume</>}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${c.name}"?`)) deleteMut.mutate(c.id);
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
