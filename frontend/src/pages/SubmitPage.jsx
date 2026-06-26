import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPublicCampaign, publicSubmit } from "../api/client";
import { CheckCircle, AlertCircle, Zap, ExternalLink, Clock, DollarSign } from "lucide-react";

const PLATFORM_CHIP = {
  tiktok:    "bg-black text-white",
  instagram: "bg-pink-500 text-white",
  youtube:   "bg-red-600 text-white",
  twitter:   "bg-sky-500 text-white",
};
const PLATFORM_LABEL = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts", twitter: "X / Twitter" };

function detectPlatform(url) {
  if (!url) return "";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "";
}

export default function SubmitPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ name: "", email: "", url: "", platform: "", tiktok_handle: "", instagram_handle: "", youtube_handle: "", title: "" });
  const [submitted, setSubmitted] = useState(null);

  const set = k => e => {
    const val = e.target.value;
    setForm(f => {
      const next = { ...f, [k]: val };
      if (k === "url") next.platform = detectPlatform(val) || f.platform;
      return next;
    });
  };

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ["public-campaign", token],
    queryFn: () => getPublicCampaign(token),
  });

  const submitMut = useMutation({
    mutationFn: d => publicSubmit(token, d),
    onSuccess: res => setSubmitted(res),
  });

  const inputCls = "mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide";

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      Loading campaign...
    </div>
  );

  if (error || !campaign) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Campaign not found</h2>
        <p className="text-gray-500 text-sm mt-1">This campaign may have ended or the link is incorrect.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Received!</h2>
        <p className="text-gray-500 text-sm mb-4">{submitted.message}</p>
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize text-yellow-600">{submitted.status}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Submission ID</span><span className="font-mono text-xs text-gray-700">#{submitted.submission_id}</span></div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Keep your post live! Views are tracked after approval. Do not delete the post or use paid promotion.
        </p>
      </div>
    </div>
  );

  const platforms = campaign.allowed_platforms || [];

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
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full font-medium capitalize">{campaign.content_type}</span>
            {campaign.category && <span className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full">{campaign.category}</span>}
          </div>
          <h1 className="text-2xl font-extrabold mb-1">{campaign.name}</h1>
          {campaign.description && <p className="text-brand-200 text-sm">{campaign.description}</p>}
          <div className="flex items-center gap-5 mt-5 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-brand-300" />
              <span className="font-bold text-white">${campaign.reward_per_1k_views}</span>
              <span className="text-brand-300">per 1K views</span>
            </div>
            {campaign.flat_fee > 0 && (
              <div className="text-brand-200">+${campaign.flat_fee} flat bonus</div>
            )}
            {campaign.max_payout_per_submission > 0 && (
              <div className="text-brand-200">Max ${campaign.max_payout_per_submission}/post</div>
            )}
            <div className="flex items-center gap-1.5 text-brand-200">
              <Clock className="w-3.5 h-3.5" /> Reviewed within 48h
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {platforms.map(p => (
              <span key={p} className={`text-xs font-bold px-2 py-0.5 rounded ${PLATFORM_CHIP[p] || "bg-white/20 text-white"}`}>
                {PLATFORM_LABEL[p] || p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Guidelines */}
      {(campaign.guidelines || campaign.tutorial_video_url) && (
        <div className="max-w-2xl mx-auto px-6 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-800 text-sm mb-2">Campaign Guidelines</h3>
            {campaign.guidelines && <p className="text-amber-700 text-sm whitespace-pre-line">{campaign.guidelines}</p>}
            {campaign.tutorial_video_url && (
              <a href={campaign.tutorial_video_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-amber-700 underline hover:text-amber-900">
                Watch tutorial video <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Submit Your Content</h2>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (!form.platform) return alert("Select a platform.");
              submitMut.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Your Name *</label>
                <input required value={form.name} onChange={set("name")} className={inputCls} placeholder="Jane Smith" />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input required type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="jane@email.com" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Post URL *</label>
              <input required value={form.url} onChange={set("url")} className={inputCls}
                placeholder="https://www.tiktok.com/@yourhandle/video/..." />
              {form.url && !form.platform && (
                <p className="text-xs text-red-500 mt-1">Could not detect platform from URL. Select below.</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Platform *</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {platforms.map(p => (
                  <button key={p} type="button" onClick={() => setForm(f => ({...f, platform: p}))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      form.platform === p
                        ? PLATFORM_CHIP[p] + " border-transparent scale-105"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}>
                    {PLATFORM_LABEL[p] || p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Content Title (optional)</label>
              <input value={form.title} onChange={set("title")} className={inputCls} placeholder="Brief title or description of your post" />
            </div>

            <div>
              <label className={labelCls}>Your Social Handles (optional)</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[["tiktok_handle","TikTok"],["instagram_handle","Instagram"],["youtube_handle","YouTube"]].map(([k,l]) => (
                  <div key={k}>
                    <span className="text-xs text-gray-400">{l}</span>
                    <input value={form[k]} onChange={set(k)} className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" placeholder="@handle" />
                  </div>
                ))}
              </div>
            </div>

            {campaign.min_payout > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                Minimum payout threshold: <strong>${campaign.min_payout}</strong>. Your post needs enough views to earn at least this amount to count.
              </div>
            )}

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
              By submitting you agree to keep your post live and not use paid promotion, bots, or artificial view inflation. Only organic views are counted.
            </div>

            {submitMut.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {submitMut.error?.response?.data?.detail || "Submission failed. Please try again."}
              </div>
            )}

            <button type="submit" disabled={submitMut.isPending}
              className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">
              {submitMut.isPending ? "Submitting..." : "Submit Content"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
