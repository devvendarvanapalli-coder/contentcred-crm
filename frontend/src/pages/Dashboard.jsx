import { useQuery } from "@tanstack/react-query";
import { getOverview, triggerScrape, triggerOutreach } from "../api/client";
import { Users, Mail, MessageCircle, TrendingUp, Play, Zap } from "lucide-react";
import { useState } from "react";

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: getOverview, refetchInterval: 30000 });
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleScrape = async () => {
    setScrapeLoading(true);
    setMsg("");
    try {
      const r = await triggerScrape();
      setMsg(`Scrape done: ${r.creators_added} creators added`);
    } catch (e) {
      setMsg("Scrape failed — check logs");
    }
    setScrapeLoading(false);
  };

  const handleOutreach = async () => {
    setOutreachLoading(true);
    setMsg("");
    try {
      const r = await triggerOutreach();
      setMsg(`Outreach done: ${r.emails_sent} emails, ${r.dms_sent} DMs`);
    } catch (e) {
      setMsg("Outreach failed — check logs");
    }
    setOutreachLoading(false);
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  const d = data || {};

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">ContentCred Creator CRM</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleScrape}
            disabled={scrapeLoading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {scrapeLoading ? "Scraping..." : "Run Scrape"}
          </button>
          <button
            onClick={handleOutreach}
            disabled={outreachLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {outreachLoading ? "Running..." : "Run Outreach"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {/* Creator stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Creators</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Scraped" value={d.creators?.total} icon={Users} color="bg-brand-500" />
          <StatCard label="Contacted" value={d.creators?.contacted} icon={Mail} color="bg-blue-500" />
          <StatCard label="Replied" value={d.creators?.replied} icon={MessageCircle} color="bg-green-500" />
          <StatCard label="Interested" value={d.creators?.interested} icon={TrendingUp} color="bg-yellow-500" />
        </div>
      </div>

      {/* Email stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Email Outreach</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Emails Sent"   value={d.email?.sent}       icon={Mail}          color="bg-indigo-500" />
          <StatCard label="Opened"        value={d.email?.opened}     sub={`${d.email?.open_rate}% rate`}  icon={TrendingUp} color="bg-purple-500" />
          <StatCard label="Replied"       value={d.email?.replied}    sub={`${d.email?.reply_rate}% rate`} icon={MessageCircle} color="bg-green-500" />
          <StatCard label="Bounced"       value={d.email?.bounced}    icon={Users} color="bg-red-400" />
        </div>
      </div>

      {/* Instagram DM stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Instagram DMs</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="DMs Sent"    value={d.instagram_dm?.sent}       icon={MessageCircle} color="bg-pink-500" />
          <StatCard label="Replied"     value={d.instagram_dm?.replied}    icon={TrendingUp}    color="bg-green-500" />
          <StatCard label="Reply Rate"  value={`${d.instagram_dm?.reply_rate}%`} icon={TrendingUp} color="bg-yellow-500" />
        </div>
      </div>
    </div>
  );
}
