import { useEffect, useState } from "react";
import { getGMPSummary } from "../../api/gmpApi";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Factory, FlaskConical, CheckCircle2, AlertTriangle, Package } from "lucide-react";

const STATUS_COLORS = {
  "In Progress": "#3b82f6",
  "QC Pending": "#f59e0b",
  "Approved": "#10b981",
  "Rejected": "#ef4444",
  "Released": "#0d9488",
};

function KPI({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGMPSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const chartData = (summary?.batches_by_status || []).map(d => ({
    ...d,
    fill: STATUS_COLORS[d.status] || "#94a3b8",
  }));

  const releasedCount = (summary?.batches_by_status || []).find(d => d.status === "Released")?.count || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GMP Reports</h1>
        <p className="text-gray-500 text-sm">Manufacturing performance summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Factory} label="Total Batches" value={summary?.total_batches} color="bg-blue-600" />
        <KPI icon={CheckCircle2} label="Released" value={releasedCount} color="bg-teal-600" />
        <KPI icon={FlaskConical} label="Materials" value={summary?.total_materials} color="bg-green-700" />
        <KPI icon={CheckCircle2} label="QC Pass Rate" value={`${summary?.pass_rate ?? 0}%`} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Batch Status Breakdown</h2>
          {chartData.length === 0 ? (
            <p className="text-gray-400 text-sm">No batch data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {(summary?.low_stock_materials || []).length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Low Stock Warnings</h2>
            </div>
            <div className="space-y-2">
              {summary.low_stock_materials.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <FlaskConical size={15} className="text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.quantity_in_stock} {m.unit} remaining</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.status === "Out of Stock" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 size={36} className="mx-auto text-green-500 mb-2" />
              <p className="text-gray-600 font-medium text-sm">All materials adequately stocked</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Package size={18} className="text-teal-600" />
          <h2 className="font-semibold text-gray-800">Recently Released Batches</h2>
        </div>
        {(summary?.recent_releases || []).length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No released batches yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Batch Number</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Qty Produced</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">End Date</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.recent_releases.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{b.batch_number}</td>
                    <td className="px-5 py-3 text-gray-700">{b.product_name}</td>
                    <td className="px-5 py-3 text-gray-600">{b.product_type}</td>
                    <td className="px-5 py-3 text-gray-800">{b.quantity_produced}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {b.end_date ? new Date(b.end_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                        Released
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
