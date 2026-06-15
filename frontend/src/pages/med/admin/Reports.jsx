import { useEffect, useState } from "react";
import { getSalesSummary, listUsers, getRepReport } from "../../../api/medApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [reps, setReps] = useState([]);
  const [selectedRep, setSelectedRep] = useState(null);
  const [repData, setRepData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSalesSummary(), listUsers()])
      .then(([s, u]) => {
        setSummary(s);
        setReps(u.filter(r => r.role === "sales_rep"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRep) {
      getRepReport(selectedRep).then(setRepData);
    }
  }, [selectedRep]);

  if (loading) return <div className="p-8 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
        <p className="text-gray-500 text-sm">Performance analytics for the entire team</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${Number(summary?.total_revenue || 0).toLocaleString("en-IN")}`, color: "text-green-600" },
          { label: "Total Orders", value: summary?.total_orders, color: "text-blue-600" },
          { label: "Total Leads", value: summary?.total_leads, color: "text-purple-600" },
          { label: "Total Visits", value: summary?.total_visits, color: "text-orange-500" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value ?? "—"}</p>
            <p className="text-sm text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue by Sales Rep</h2>
          {(summary?.revenue_by_rep || []).length === 0 ? (
            <p className="text-gray-400 text-sm">No orders recorded yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.revenue_by_rep}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rep" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Leads by State (Top 10)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary?.leads_by_state || []} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="state" type="category" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Individual Rep Report</h2>
        <div className="flex gap-3 mb-5">
          {reps.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRep(r.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRep === r.id ? "bg-blue-700 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {repData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Leads", value: repData.total_leads },
                { label: "Visits", value: repData.total_visits },
                { label: "Orders", value: repData.total_orders },
                { label: "Revenue", value: `₹${Number(repData.total_revenue || 0).toLocaleString("en-IN")}` },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Visits</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {(repData.recent_visits || []).length === 0 ? (
                  <p className="p-4 text-gray-400 text-sm">No visits yet</p>
                ) : repData.recent_visits.map(v => (
                  <div key={v.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{v.purpose || "Visit"}</p>
                      <p className="text-xs text-gray-500">{v.outcome || ""}</p>
                    </div>
                    <p className="text-xs text-gray-400">{v.location_state || ""}</p>
                    <p className="text-xs text-gray-400">
                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-IN") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Select a rep to view their report</p>
        )}
      </div>
    </div>
  );
}
