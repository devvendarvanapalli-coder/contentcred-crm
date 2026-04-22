import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCreators, updateCreator, deleteCreator } from "../api/client";
import { useState } from "react";
import { Search, ExternalLink, Trash2 } from "lucide-react";

const STATUS_COLORS = {
  New: "bg-gray-100 text-gray-600",
  Contacted: "bg-blue-100 text-blue-700",
  Replied: "bg-green-100 text-green-700",
  Interested: "bg-yellow-100 text-yellow-700",
  "Not Interested": "bg-red-100 text-red-700",
  Closed: "bg-purple-100 text-purple-700",
};

const PERSONA_BADGE = {
  musician: "bg-pink-100 text-pink-700",
  video_creator: "bg-blue-100 text-blue-700",
  personal_brand: "bg-indigo-100 text-indigo-700",
};

function fmtNum(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export default function Creators() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [persona, setPersona] = useState("");
  const [page, setPage] = useState(1);

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creators", { search, status, persona, page }],
    queryFn: () => getCreators({ search, status, persona, page, per_page: 50 }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateCreator(id, data),
    onSuccess: () => qc.invalidateQueries(["creators"]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCreator(id),
    onSuccess: () => qc.invalidateQueries(["creators"]),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Creators</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Search name, niche, handle..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          value={persona}
          onChange={e => { setPersona(e.target.value); setPage(1); }}
        >
          <option value="">All personas</option>
          <option value="musician">Musician</option>
          <option value="video_creator">Video Creator</option>
          <option value="personal_brand">Personal Brand</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Creator</th>
                <th className="px-4 py-3 text-left">Persona</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-left">Niche</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {creators.map(c => {
                const audience =
                  fmtNum(c.youtube_subs) !== "—" ? `${fmtNum(c.youtube_subs)} subs` :
                  fmtNum(c.spotify_monthly) !== "—" ? `${fmtNum(c.spotify_monthly)} listeners` :
                  fmtNum(c.instagram_followers) !== "—" ? `${fmtNum(c.instagram_followers)} followers` :
                  fmtNum(c.tiktok_followers) !== "—" ? `${fmtNum(c.tiktok_followers)} followers` : "—";

                const profileUrl =
                  c.youtube_channel || c.spotify_profile ||
                  (c.instagram_handle ? `https://instagram.com/${c.instagram_handle}` : "") ||
                  (c.tiktok_handle ? `https://tiktok.com/@${c.tiktok_handle}` : "");

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 flex items-center gap-1">
                        {c.full_name || "Unknown"}
                        {profileUrl && (
                          <a href={profileUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3 h-3 text-gray-400 hover:text-brand-500" />
                          </a>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs">{c.email || "no email"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERSONA_BADGE[c.persona] || "bg-gray-100 text-gray-600"}`}>
                        {c.persona?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{c.primary_platform || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{audience}</td>
                    <td className="px-4 py-3 text-gray-600">{c.niche || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[c.status] || ""}`}
                        value={c.status}
                        onChange={e => updateMut.mutate({ id: c.id, data: { status: e.target.value } })}
                      >
                        {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm("Delete?")) deleteMut.mutate(c.id); }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {creators.length === 0 && (
            <div className="text-center py-12 text-gray-400">No creators found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">Page {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={creators.length < 50}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
