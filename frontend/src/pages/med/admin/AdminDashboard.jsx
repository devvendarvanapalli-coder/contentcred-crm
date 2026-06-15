import { useEffect, useState } from "react";
import { getSalesSummary, listUsers } from "../../../api/medApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, FileText, ShoppingCart, TrendingUp, MapPin, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_COLORS = {
  New: "#3b82f6",
  Contacted: "#f59e0b",
  Interested: "#10b981",
  "Demo Done": "#8b5cf6",
  "Order Placed": "#059669",
  Lost: "#ef4444",
};

function StatCard({ icon: Icon, label, value, color, to }) {
  const inner = (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 ${to ? "hover:shadow-md transition-shadow" : ""}`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSalesSummary(), listUsers()])
      .then(([s, u]) => {
        setSummary(s);
        setReps(u.filter(r => r.role === "sales_rep"));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const pieData = (summary?.leads_by_status || []).map(d => ({
    name: d.status,
    value: d.count,
    fill: STATUS_COLORS[d.status] || "#94a3b8",
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">MediThread Sales Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={FileText} label="Total Leads" value={summary?.total_leads} color="bg-blue-600" to="/med/admin/leads" />
        <StatCard icon={Users} label="Sales Reps" value={summary?.total_reps} color="bg-purple-600" to="/med/admin/reps" />
        <StatCard icon={MapPin} label="Visits" value={summary?.total_visits} color="bg-teal-600" />
        <StatCard icon={ShoppingCart} label="Orders" value={summary?.total_orders} color="bg-orange-500" to="/med/admin/orders" />
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={`₹${Number(summary?.total_revenue || 0).toLocaleString("en-IN")}`}
          color="bg-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Leads by State</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.leads_by_state || []} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="state" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Lead Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue by Sales Rep</h2>
          {(summary?.revenue_by_rep || []).length === 0 ? (
            <p className="text-gray-400 text-sm">No orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.revenue_by_rep}>
                <XAxis dataKey="rep" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Sales Team</h2>
            <Link to="/med/admin/reps" className="text-blue-600 text-sm hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {reps.length === 0 && <p className="text-gray-400 text-sm">No sales reps yet</p>}
            {reps.map(rep => (
              <div key={rep.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {rep.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{rep.name}</p>
                  <p className="text-xs text-gray-500 truncate">{rep.territory || "No territory"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${rep.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {rep.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
