import { useQuery, useMutation } from "@tanstack/react-query";
import { getEnrollments, triggerOutreach, triggerScrape } from "../api/client";
import { format } from "date-fns";
import { Play, Zap } from "lucide-react";
import { useState } from "react";

const STATUS_COLOR = {
  active:       "bg-green-100 text-green-700",
  paused:       "bg-yellow-100 text-yellow-700",
  completed:    "bg-gray-100 text-gray-600",
  unsubscribed: "bg-red-100 text-red-600",
  replied:      "bg-blue-100 text-blue-700",
};

export default function Sequences() {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments"],
    queryFn: getEnrollments,
    refetchInterval: 15000,
  });

  const [scrapeMsg, setScrapeMsg] = useState("");
  const [outreachMsg, setOutreachMsg] = useState("");

  const handleScrape = async () => {
    setScrapeMsg("Running...");
    try {
      const r = await triggerScrape();
      setScrapeMsg(`Done: ${r.creators_added} creators added`);
    } catch { setScrapeMsg("Failed"); }
  };

  const handleOutreach = async () => {
    setOutreachMsg("Running...");
    try {
      const r = await triggerOutreach();
      setOutreachMsg(`Done: ${r.emails_sent} emails, ${r.dms_sent} DMs`);
    } catch { setOutreachMsg("Failed"); }
  };

  const emailCount  = enrollments.filter(e => e.channel === "email").length;
  const igCount     = enrollments.filter(e => e.channel === "instagram").length;
  const activeCount = enrollments.filter(e => e.status === "active").length;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>

      {/* Manual controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-2">Daily Scrape</h3>
          <p className="text-sm text-gray-500 mb-3">Auto-runs at 6:00 AM. Click to run now.</p>
          <button
            onClick={handleScrape}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Zap className="w-4 h-4" /> Run Scrape Now
          </button>
          {scrapeMsg && <p className="text-xs text-gray-500 mt-2">{scrapeMsg}</p>}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-2">Daily Outreach</h3>
          <p className="text-sm text-gray-500 mb-3">Auto-runs at 10:00 AM. Click to run now.</p>
          <button
            onClick={handleOutreach}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Play className="w-4 h-4" /> Run Outreach Now
          </button>
          {outreachMsg && <p className="text-xs text-gray-500 mt-2">{outreachMsg}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Email Sequences", value: emailCount },
          { label: "Instagram DM Sequences", value: igCount },
          { label: "Active Right Now", value: activeCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Enrollments table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Active Enrollments</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Creator ID</th>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Step</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Next Send</th>
                <th className="px-4 py-3 text-left">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrollments.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">#{e.creator_id}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{e.channel}</td>
                  <td className="px-4 py-3 text-gray-600">Step {e.current_step + 1}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[e.status] || "bg-gray-100 text-gray-600"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.next_send_at ? format(new Date(e.next_send_at), "MMM d, HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.enrolled_at ? format(new Date(e.enrolled_at), "MMM d") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && enrollments.length === 0 && (
          <div className="text-center py-12 text-gray-400">No enrollments yet. Run the scraper first.</div>
        )}
      </div>
    </div>
  );
}
