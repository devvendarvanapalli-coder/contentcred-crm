import { useQuery } from "@tanstack/react-query";
import { getOverview, getByPersona, getByPlatform, getScraperRuns } from "../api/client";
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { format } from "date-fns";

const COLORS = ["#c44df0", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Analytics() {
  const { data: overview }  = useQuery({ queryKey: ["overview"],    queryFn: getOverview });
  const { data: personas }  = useQuery({ queryKey: ["personas"],    queryFn: getByPersona });
  const { data: platforms } = useQuery({ queryKey: ["platforms"],   queryFn: getByPlatform });
  const { data: runs }      = useQuery({ queryKey: ["scrapeRuns"],  queryFn: getScraperRuns });

  const em = overview?.email || {};
  const funnelData = [
    { name: "Scraped",    value: overview?.creators?.total    || 0 },
    { name: "Contacted",  value: overview?.creators?.contacted || 0 },
    { name: "Replied",    value: overview?.creators?.replied   || 0 },
    { name: "Interested", value: overview?.creators?.interested || 0 },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Email KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Emails Sent",  value: em.sent },
          { label: "Open Rate",    value: `${em.open_rate}%` },
          { label: "Reply Rate",   value: `${em.reply_rate}%` },
          { label: "Bounced",      value: em.bounced },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-700 mb-4">Outreach Funnel</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#c44df0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Persona */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">By Persona</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={personas || []} dataKey="count" nameKey="persona" cx="50%" cy="50%" outerRadius={80} label>
                {(personas || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Platform */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">By Platform</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={platforms || []} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={80} label>
                {(platforms || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scraper run history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Scraper Runs</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Found</th>
              <th className="px-4 py-3 text-left">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(runs || []).map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {r.started_at ? format(new Date(r.started_at), "MMM d, HH:mm") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "completed" ? "bg-green-100 text-green-700" :
                    r.status === "failed"    ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.creators_found}</td>
                <td className="px-4 py-3 text-gray-600">{r.creators_added}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!runs || runs.length === 0) && (
          <div className="text-center py-8 text-gray-400">No scraper runs yet</div>
        )}
      </div>
    </div>
  );
}
