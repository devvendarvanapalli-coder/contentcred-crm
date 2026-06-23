import { useEffect, useState } from "react";
import { getGMPSummary } from "../../api/gmpApi";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Factory, Package, FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_COLORS = {
  "In Progress": "#3b82f6",
  "QC Pending": "#f59e0b",
  "Approved": "#10b981",
  "Rejected": "#ef4444",
  "Released": "#0d9488",
};

function KPICard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function GMPDashboard() {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GMP Dashboard</h1>
        <p className="text-gray-500 text-sm">MediThread — Good Manufacturing Practice Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard icon={Factory} label="Total Batches" value={summary?.total_batches} color="bg-blue-600" />
        <KPICard icon={CheckCircle2} label="Released Batches" value={releasedCount} color="bg-teal-600" />
        <KPICard icon={FlaskConical} label="Raw Materials" value={summary?.total_materials} color="bg-green-700" />
        <KPICard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={summary?.low_stock_materials?.length || 0}
          color="bg-orange-500"
        />
        <KPICard
          icon={CheckCircle2}
          label="QC Pass Rate"
          value={`${summary?.pass_rate ?? 0}%`}
          color="bg-purple-600"
          sub={`${summary?.total_qc_tests || 0} tests total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Batches by Status</h2>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Releases</h2>
          {(summary?.recent_releases || []).length === 0 ? (
            <p className="text-gray-400 text-sm">No released batches yet</p>
          ) : (
            <div className="space-y-3">
              {summary.recent_releases.map(b => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Factory size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.batch_number}</p>
                    <p className="text-xs text-gray-500 truncate">{b.product_name} — {b.product_type}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                    Released
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(summary?.low_stock_materials || []).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Low Stock / Out of Stock Materials</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.low_stock_materials.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <FlaskConical size={16} className="text-orange-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.quantity_in_stock} {m.unit} in stock</p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.status === "Out of Stock" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
