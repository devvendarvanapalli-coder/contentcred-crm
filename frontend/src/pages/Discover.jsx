import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDiscover } from "../api/client";
import { Search, DollarSign, Eye, Clock, ChevronRight, Zap, Globe } from "lucide-react";

function fv(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PLATFORM_CHIP = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
  twitter:   "bg-sky-500 text-white",
};
const PLATFORM_LABEL = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", twitter: "X" };

const TYPE_CHIP = {
  clipping: "bg-purple-100 text-purple-700",
  ugc:      "bg-blue-100 text-blue-700",
  other:    "bg-gray-100 text-gray-600",
};

export default function Discover() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["discover"],
    queryFn: getDiscover,
    refetchInterval: 60000,
  });

  const filtered = campaigns.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.content_type === filter || c.allowed_platforms?.includes(filter);
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-950 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/70 text-sm font-medium">ContentCred — Content Rewards</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-3 leading-tight">Get paid to post content</h1>
          <p className="text-brand-200 text-lg max-w-xl">
            Browse active campaigns, submit your clips, and earn money based on organic views. No follower requirements.
          </p>
          <div className="flex items-center gap-6 mt-8 text-sm">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-brand-300" /><span className="text-white/80">Paid per 1K views</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-300" /><span className="text-white/80">Reviewed within 48h</span></div>
            <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-brand-300" /><span className="text-white/80">TikTok, Instagram, YouTube & more</span></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              ["all", "All"],
              ["clipping", "Clipping"],
              ["ugc", "UGC"],
              ["tiktok", "TikTok"],
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} campaigns live</span>
        </div>
      </div>

      {/* Campaign grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading campaigns...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No campaigns match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden flex flex-col">
                {/* Card header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_CHIP[c.content_type] || "bg-gray-100 text-gray-600"}`}>
                        {c.content_type}
                      </span>
                      {c.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.category}</span>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-brand-600">${c.reward_per_1k_views}</div>
                      <div className="text-xs text-gray-400">per 1K views</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1.5">{c.name}</h3>
                  {c.description && <p className="text-gray-500 text-sm line-clamp-2 mb-3">{c.description}</p>}

                  {/* Platforms */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {c.allowed_platforms?.map(p => (
                      <span key={p} className={`text-xs font-bold px-2 py-0.5 rounded ${PLATFORM_CHIP[p] || "bg-gray-200 text-gray-700"}`}>
                        {PLATFORM_LABEL[p] || p}
                      </span>
                    ))}
                  </div>

                  {/* Budget remaining */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Budget remaining</span>
                      <span className="font-semibold text-gray-700">${fv(c.budget_remaining)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  {/* Payout rules */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 flex-wrap">
                    {c.flat_fee > 0 && <span>+${c.flat_fee} flat bonus</span>}
                    {c.min_payout > 0 && <span>Min payout: ${c.min_payout}</span>}
                    {c.max_payout_per_submission > 0 && <span>Max: ${c.max_payout_per_submission}/submission</span>}
                    {c.end_date && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Ends {new Date(c.end_date).toLocaleDateString()}</span>}
                  </div>
                </div>

                {/* CTA */}
                <div className="border-t border-gray-50 px-5 py-3">
                  <button
                    onClick={() => navigate(`/submit/${c.submission_token}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
                  >
                    Submit Content <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
